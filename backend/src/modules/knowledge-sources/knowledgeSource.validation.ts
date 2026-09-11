import { z } from "zod";

/**
 * POST /api/v1/chatbots/:chatbotId/knowledge-sources — one branch per
 * client-creatable `type`, discriminated on that field. `.strict()` on every
 * branch rejects any unrecognized/protected key outright: chatbotId (comes
 * from the route param, never the body), status, storageKey, createdBy,
 * sizeBytes, mimeType, originalName, title, author, language, contentType,
 * lastProcessedAt, error, id, createdAt, updatedAt — none of these are
 * accepted from the client at creation.
 *
 * FILE is intentionally not a branch here yet — its multipart/file-upload
 * contract will be designed separately alongside the R2 upload flow.
 */
const urlKnowledgeSourceSchema = z
  .object({
    type: z.literal("URL"),
    name: z
      .string({ message: "name is required" })
      .trim()
      .min(1, "name is required")
      .max(120, "name must be at most 120 characters"),
    sourceUrl: z
      .string({ message: "sourceUrl is required" })
      .trim()
      .pipe(z.url({ message: "sourceUrl must be a valid URL" })),
  })
  .strict();

const webpageKnowledgeSourceSchema = z
  .object({
    type: z.literal("WEBPAGE"),
    name: z
      .string({ message: "name is required" })
      .trim()
      .min(1, "name is required")
      .max(120, "name must be at most 120 characters"),
    sourceUrl: z
      .string({ message: "sourceUrl is required" })
      .trim()
      .pipe(z.url({ message: "sourceUrl must be a valid URL" })),
  })
  .strict();

const textKnowledgeSourceSchema = z
  .object({
    type: z.literal("TEXT"),
    name: z
      .string({ message: "name is required" })
      .trim()
      .min(1, "name is required")
      .max(120, "name must be at most 120 characters"),
    sourceText: z
      .string({ message: "sourceText is required" })
      .min(1, "sourceText is required"),
  })
  .strict();

export const createKnowledgeSourceSchema = z.discriminatedUnion("type", [
  urlKnowledgeSourceSchema,
  webpageKnowledgeSourceSchema,
  textKnowledgeSourceSchema,
]);

export type CreateKnowledgeSourceBody = z.infer<
  typeof createKnowledgeSourceSchema
>;

/**
 * MIME types accepted for FILE knowledge sources, and the hard size ceiling
 * (25 MB) enforced both here and by the presigned PUT's Content-Length range
 * once actual upload-completion handling exists.
 */
export const SUPPORTED_FILE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "text/markdown",
] as const;

export const MAX_FILE_SIZE_BYTES = 26_214_400;

/**
 * POST /api/v1/knowledge-sources/:chatbotId/upload — initializes a FILE
 * upload by requesting a presigned R2 PUT URL. `.strict()` rejects
 * chatbotId (route param, never the body), storageKey, status, createdBy,
 * and every other server-managed field. This does not create the
 * KnowledgeSource document — only validates the metadata needed to generate
 * a storage key and a bound presigned URL.
 */
export const initiateFileUploadSchema = z
  .object({
    originalName: z
      .string({ message: "originalName is required" })
      .trim()
      .min(1, "originalName is required")
      .max(255, "originalName must be at most 255 characters"),
    mimeType: z.enum(SUPPORTED_FILE_MIME_TYPES, {
      message: "mimeType must be one of the supported file types",
    }),
    sizeBytes: z
      .number({ message: "sizeBytes must be a number" })
      .int("sizeBytes must be an integer")
      .positive("sizeBytes must be positive")
      .max(
        MAX_FILE_SIZE_BYTES,
        `sizeBytes must be at most ${MAX_FILE_SIZE_BYTES} bytes (25 MB)`,
      ),
  })
  .strict();

export type InitiateFileUploadBody = z.infer<typeof initiateFileUploadSchema>;
