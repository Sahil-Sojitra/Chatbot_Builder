import { z } from "zod";

/**
 * POST /api/v1/chatbots — `.strict()` rejects any unrecognized/protected
 * key outright (organizationId, createdBy, status, publicId, publishedBy,
 * publishedAt, id, createdAt, updatedAt, deletedAt, uiConfig — none of
 * these are accepted from the client for creation).
 *
 * temperature/maxTokens/ragTopK/ragSimilarityThreshold use broad sanity
 * bounds common across LLM providers, not a specific provider's limits —
 * there is no project-established provider config to pull real limits from.
 */
export const createChatbotSchema = z
  .object({
    name: z
      .string({ message: "name is required" })
      .trim()
      .min(1, "name is required")
      .max(120, "name must be at most 120 characters"),
    description: z
      .string({ message: "description must be a string" })
      .trim()
      .max(500, "description must be at most 500 characters")
      .optional(),
    systemPrompt: z
      .string({ message: "systemPrompt must be a string" })
      .trim()
      .max(8000, "systemPrompt must be at most 8000 characters")
      .optional(),
    provider: z
      .string({ message: "provider must be a string" })
      .trim()
      .min(1, "provider cannot be empty")
      .max(60, "provider must be at most 60 characters")
      .optional(),
    model: z
      .string({ message: "model must be a string" })
      .trim()
      .min(1, "model cannot be empty")
      .max(120, "model must be at most 120 characters")
      .optional(),
    temperature: z
      .number({ message: "temperature must be a number" })
      .min(0, "temperature must be at least 0")
      .max(2, "temperature must be at most 2")
      .optional(),
    maxTokens: z
      .number({ message: "maxTokens must be a number" })
      .int("maxTokens must be an integer")
      .positive("maxTokens must be positive")
      .max(32000, "maxTokens must be at most 32000")
      .optional(),
    ragEnabled: z.boolean({ message: "ragEnabled must be a boolean" }).optional(),
    ragTopK: z
      .number({ message: "ragTopK must be a number" })
      .int("ragTopK must be an integer")
      .positive("ragTopK must be positive")
      .max(50, "ragTopK must be at most 50")
      .optional(),
    ragSimilarityThreshold: z
      .number({ message: "ragSimilarityThreshold must be a number" })
      .min(0, "ragSimilarityThreshold must be at least 0")
      .max(1, "ragSimilarityThreshold must be at most 1")
      .optional(),
  })
  .strict();
