import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "../config/env.js";
import { AppError } from "./errors.js";

let cachedClient: S3Client | null = null;

const getStorageClient = (): S3Client => {
  if (cachedClient) {
    return cachedClient;
  }

  const { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "Object storage is not configured",
    );
  }

  cachedClient = new S3Client({
    region: env.S3_REGION ?? "auto",
    endpoint: S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    },
  });

  return cachedClient;
};

export const createPresignedUploadUrl = async (
  key: string,
  contentType: string,
  expiresInSeconds: number,
): Promise<string> => {
  if (!env.S3_BUCKET_NAME) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "Object storage is not configured",
    );
  }

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(getStorageClient(), command, {
    expiresIn: expiresInSeconds,
  });
};

export interface StorageObjectMetadata {
  sizeBytes: number;
  contentType: string | null;
}

export const headObject = async (
  key: string,
): Promise<StorageObjectMetadata | null> => {
  if (!env.S3_BUCKET_NAME) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "Object storage is not configured",
    );
  }

  try {
    const result = await getStorageClient().send(
      new HeadObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
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

export const downloadObject = async (key: string): Promise<Buffer> => {
  if (!env.S3_BUCKET_NAME) {
    throw new AppError(
      500,
      "INTERNAL_ERROR",
      "Object storage is not configured",
    );
  }

  const result = await getStorageClient().send(
    new GetObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
  );

  if (!result.Body) {
    throw new AppError(500, "INTERNAL_ERROR", "Downloaded object has no body");
  }

  const bytes = await result.Body.transformToByteArray();
  return Buffer.from(bytes);
};
