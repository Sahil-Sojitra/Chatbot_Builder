import type { Chatbot } from "@/types/chatbot";

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
  temperature?: number;
  maxTokens?: number;
}

export interface ChatbotResponse {
  chatbot: Chatbot;
}

export interface ChatbotListResponse {
  chatbots: Chatbot[];
}

/** Thin wrapper over the backend's real, already-implemented chatbot endpoints (backend/src/modules/chatbots) — no new endpoints, no mocking. */
export const chatbotsApi = {
  create: (input: CreateChatbotInput): Promise<ChatbotResponse> =>
    apiRequest<ChatbotResponse>("/api/v1/chatbots", {
      method: "POST",
      body: input,
    }),

  list: (): Promise<ChatbotListResponse> => apiRequest<ChatbotListResponse>("/api/v1/chatbots"),

  get: (id: string): Promise<ChatbotResponse> =>
    apiRequest<ChatbotResponse>(`/api/v1/chatbots/${id}`),
};
