import type { ChatbotCreationMode, IChatbot } from "./chatbot.model.js";

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
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  sessionMessageLimit?: number | null;
  ragEnabled?: boolean;
  ragTopK?: number;
  ragSimilarityThreshold?: number;
  starterQuestions?: string[];
  creationMode?: ChatbotCreationMode;
}

/**
 * Client-editable fields for PATCH /api/v1/chatbots/:id — a partial subset
 * of the creation fields, with the same value rules. slug, status,
 * publicId, organizationId, createdBy and the publishing fields are never
 * editable here; uiConfig remains protected (no validated shape exists).
 * creationMode is set at creation and is not client-editable.
 */
export type UpdateChatbotInput = Partial<Omit<CreateChatbotInput, "creationMode">>;

export interface PublicChatbot {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  status: IChatbot["status"];
  creationMode: ChatbotCreationMode;
  publicId: string;
  systemPrompt: string | null;
  provider: string | null;
  model: string | null;
  hasApiKey: boolean;
  temperature: number | null;
  maxTokens: number | null;
  sessionMessageLimit: number | null;
  ragEnabled: boolean;
  ragTopK: number | null;
  ragSimilarityThreshold: number | null;
  starterQuestions: string[];
  uiConfig: Record<string, unknown> | null;
  createdBy: string;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatMessageInput {
  message?: string;
  question?: string;
  topK?: number;
  chatHistory?: ChatHistoryMessage[];
  chat_history?: ChatHistoryMessage[];
}

export interface ChatResponseData {
  answer: string;
  sources: Array<{
    chunk_id: string;
    source_url: string;
    canonical_url: string;
    title: string | null;
    score: number;
    snippet: string;
  }>;
  hasGroundedEvidence: boolean;
  stats?: {
    retrieval_duration_ms: number;
    generation_duration_ms: number;
    total_duration_ms: number;
    model_used: string;
    chunks_retrieved: number;
  };
}
