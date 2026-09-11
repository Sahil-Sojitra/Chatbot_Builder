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
