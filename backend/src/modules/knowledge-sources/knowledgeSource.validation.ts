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
 * (25 MB) enforced both here and by the presigned PUT's Content-Length range.
 */
export const SUPPORTED_FILE_MIME_TYPES = [
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  // Presentations
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  // Plain text & markdown
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  // Tabular data
  "text/csv",
  "application/csv",
  "text/x-csv",
  // Images (multimodal vision OCR)
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const EXTENSION_TO_MIME: Record<string, (typeof SUPPORTED_FILE_MIME_TYPES)[number]> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  txt: "text/plain",
  text: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export const resolveMimeTypeFromFilename = (
  filename: string,
): (typeof SUPPORTED_FILE_MIME_TYPES)[number] | null => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext && ext in EXTENSION_TO_MIME) {
    return EXTENSION_TO_MIME[ext]!;
  }
  return null;
};

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
  })
  .strict();

export type InitiateFileUploadBody = z.infer<typeof initiateFileUploadSchema>;

/**
 * POST /api/v1/knowledge-sources/:chatbotId/upload/complete — completes a
 * previously initiated FILE upload. `.strict()` rejects storageKey,
 * chatbotId, status, createdBy, sizeBytes, mimeType, originalName, and every
 * other server-managed field: the client supplies nothing but the opaque
 * upload identifier handed back by the initiate step, and the server
 * resolves everything else from that record plus a live R2 lookup.
 */
export const completeFileUploadSchema = z
  .object({
    uploadId: z
      .string({ message: "uploadId is required" })
      .trim()
      .min(1, "uploadId is required"),
  })
  .strict();

export type CompleteFileUploadBody = z.infer<typeof completeFileUploadSchema>;

/**
 * PATCH /api/v1/knowledge-sources/:chatbotId/:sourceId — partial update.
 * Allows updating name and/or sourceText (for text sources).
 */
export const updateKnowledgeSourceSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "name cannot be empty")
      .max(120, "name must be at most 120 characters")
      .optional(),
    sourceText: z
      .string()
      .min(1, "sourceText cannot be empty")
      .max(500000, "sourceText exceeds 500,000 characters")
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided to update",
  });

export type UpdateKnowledgeSourceBody = z.infer<typeof updateKnowledgeSourceSchema>;
