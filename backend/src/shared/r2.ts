import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../config/env.js";
import { AppError } from "./errors.js";

/**
 * R2 is S3-compatible, so the AWS SDK v3 S3 client talks to it directly via
 * the account-scoped endpoint — no separate R2 SDK exists or is needed.
 * Lazily constructed (not at module load) so a server without R2 configured
 * yet can still start and serve every other route; only a request that
 * actually needs R2 fails, with a clear error.
 */
let cachedClient: S3Client | null = null;

const getR2Client = (): S3Client => {
  if (cachedClient) {
    return cachedClient;
  }

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "Object storage is not configured",
    );
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  return cachedClient;
};

/**
 * Generates a presigned PUT URL for a single object, bound to the given
 * content type — the client can only complete the upload by sending that
 * exact Content-Type header, and cannot reuse the URL for a different key
 * or object. No R2 credentials are ever exposed to the caller.
 */
export const createPresignedUploadUrl = async (
  key: string,
  contentType: string,
  expiresInSeconds: number,
): Promise<string> => {
  if (!env.R2_BUCKET_NAME) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "Object storage is not configured",
    );
  }

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: expiresInSeconds,
  });
};

export interface R2ObjectMetadata {
  sizeBytes: number;
  contentType: string | null;
}

/**
 * Reads an object's actual metadata straight from R2 via HEAD — the only
 * source of truth for whether an upload really happened and what was
 * actually stored, since none of it can be trusted from the client. Returns
 * null when the object does not exist rather than throwing, so callers can
 * treat "missing" as an ordinary verification failure.
 */
export const headObject = async (
  key: string,
): Promise<R2ObjectMetadata | null> => {
  if (!env.R2_BUCKET_NAME) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "Object storage is not configured",
    );
  }

  try {
    const result = await getR2Client().send(
      new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
    );

    return {
      sizeBytes: result.ContentLength ?? 0,
      contentType: result.ContentType ?? null,
    };
  } catch (error) {
    const name = (error as { name?: string }).name;
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode;

    if (name === "NotFound" || name === "NoSuchKey" || statusCode === 404) {
      return null;
    }

    throw error;
  }
};

/**
 * Downloads an object's full body from R2, for the ingestion worker to read
 * a FILE knowledge source's original upload. Used only server-side, on a
 * storageKey already verified by headObject() — never on client input.
 */
export const downloadObject = async (key: string): Promise<Buffer> => {
  if (!env.R2_BUCKET_NAME) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "Object storage is not configured",
    );
  }

  const result = await getR2Client().send(
    new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
  );

  if (!result.Body) {
    throw new AppError(500, "INTERNAL_ERROR", "Downloaded object has no body");
  }

  const bytes = await result.Body.transformToByteArray();
  return Buffer.from(bytes);
};
