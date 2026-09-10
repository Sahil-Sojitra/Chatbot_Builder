import type { IChatbot } from "./chatbot.model.js";

/**
 * Client-configurable fields at creation time. provider/model have no
 * project-established default (no AI SDK/config exists yet), so they're
 * optional here with no server-side fallback value. uiConfig is
 * deliberately NOT accepted at creation — there is no existing shape for
 * it anywhere in the project to validate against.
 */
export interface CreateChatbotInput {
  name: string;
  description?: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  ragEnabled?: boolean;
  ragTopK?: number;
  ragSimilarityThreshold?: number;
}

/**
 * Client-editable fields for PATCH /api/v1/chatbots/:id — a partial subset
 * of the creation fields, with the same value rules. slug, status,
 * publicId, organizationId, createdBy and the publishing fields are never
 * editable here; uiConfig remains protected (no validated shape exists).
 */
export type UpdateChatbotInput = Partial<CreateChatbotInput>;

export interface PublicChatbot {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  status: IChatbot["status"];
  publicId: string;
  systemPrompt: string | null;
  provider: string | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  ragEnabled: boolean;
  ragTopK: number | null;
  ragSimilarityThreshold: number | null;
  uiConfig: Record<string, unknown> | null;
  createdBy: string;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
