import type { Chatbot, ChatbotCreationMode } from "@/types/chatbot";

import { apiRequest } from "./client";

/**
 * Deliberately excludes ragEnabled/ragTopK/ragSimilarityThreshold — the
 * backend accepts them, but no RAG pipeline actually runs yet, so this
 * milestone's creation flow never sends them (see
 * features/chatbots/components/CreateChatbotForm.tsx).
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
  creationMode?: ChatbotCreationMode;
}

export type UpdateChatbotInput = Partial<Omit<CreateChatbotInput, "creationMode">>;

export interface ChatbotResponse {
  chatbot: Chatbot;
}

export interface ChatbotListResponse {
  chatbots: Chatbot[];
}

export interface ChatSourceReference {
  chunk_id: string;
  source_url: string;
  canonical_url: string;
  title: string | null;
  score: number;
  snippet: string;
}

export interface ChatResponse {
  answer: string;
  sources?: ChatSourceReference[];
  hasGroundedEvidence?: boolean;
  stats?: {
    retrieval_duration_ms: number;
    generation_duration_ms: number;
    total_duration_ms: number;
    model_used: string;
    chunks_retrieved: number;
  };
}

/** Thin wrapper over the backend's real, already-implemented chatbot endpoints (backend/src/modules/chatbots) */
export const chatbotsApi = {
  create: (input: CreateChatbotInput): Promise<ChatbotResponse> =>
    apiRequest<ChatbotResponse>("/api/v1/chatbots", {
      method: "POST",
      body: input,
    }),

  list: (): Promise<ChatbotListResponse> => apiRequest<ChatbotListResponse>("/api/v1/chatbots"),

  get: (id?: string | null): Promise<ChatbotResponse> => {
    const trimmedId = id?.trim();
    if (!trimmedId) {
      return Promise.reject(new Error("Chatbot ID is required."));
    }
    return apiRequest<ChatbotResponse>(`/api/v1/chatbots/${trimmedId}`);
  },

  update: (id: string, input: UpdateChatbotInput): Promise<ChatbotResponse> => {
    const trimmedId = id?.trim();
    if (!trimmedId) {
      return Promise.reject(new Error("Chatbot ID is required."));
    }
    return apiRequest<ChatbotResponse>(`/api/v1/chatbots/${trimmedId}`, {
      method: "PATCH",
      body: input,
    });
  },

  publish: (id: string): Promise<ChatbotResponse> => {
    const trimmedId = id?.trim();
    if (!trimmedId) {
      return Promise.reject(new Error("Chatbot ID is required."));
    }
    return apiRequest<ChatbotResponse>(`/api/v1/chatbots/${trimmedId}/publish`, {
      method: "POST",
    });
  },

  unpublish: (id: string): Promise<ChatbotResponse> => {
    const trimmedId = id?.trim();
    if (!trimmedId) {
      return Promise.reject(new Error("Chatbot ID is required."));
    }
    return apiRequest<ChatbotResponse>(`/api/v1/chatbots/${trimmedId}/unpublish`, {
      method: "POST",
    });
  },

  chat: (id: string, message: string): Promise<ChatResponse> => {
    const trimmedId = id?.trim();
    if (!trimmedId) {
      return Promise.reject(new Error("Chatbot ID is required."));
    }
    return apiRequest<ChatResponse>(`/api/v1/chatbots/${trimmedId}/chat`, {
      method: "POST",
      body: { message },
    });
  },

  delete: (id: string): Promise<{ deleted: boolean }> => {
    const trimmedId = id?.trim();
    if (!trimmedId) {
      return Promise.reject(new Error("Chatbot ID is required."));
    }
    return apiRequest<{ deleted: boolean }>(`/api/v1/chatbots/${trimmedId}`, {
      method: "DELETE",
    });
  },
};
