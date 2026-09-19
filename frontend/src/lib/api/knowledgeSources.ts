import type { KnowledgeSource } from "@/types/knowledgeSource";

import { apiRequest } from "./client";

export interface CreateTextKnowledgeSourceInput {
  type: "TEXT";
  name: string;
  sourceText: string;
}

export interface CreateUrlKnowledgeSourceInput {
  type: "URL" | "WEBPAGE";
  name: string;
  sourceUrl: string;
}

export type CreateKnowledgeSourceInput =
  | CreateTextKnowledgeSourceInput
  | CreateUrlKnowledgeSourceInput;

export interface KnowledgeSourceResponse {
  knowledgeSource: KnowledgeSource;
}

export interface KnowledgeSourceListResponse {
  knowledgeSources: KnowledgeSource[];
}

/**
 * Thin wrapper over the backend's real, already-implemented knowledge-source
 * endpoints (backend/src/modules/knowledge-sources) — no new endpoints, no
 * mocking. The FILE upload endpoints (POST .../upload and
 * .../upload/complete) exist on the backend and are real, but are
 * deliberately not called from anywhere in the frontend yet — see
 * features/knowledge-sources/components/AddKnowledgeForm.tsx for why.
 */
export const knowledgeSourcesApi = {
  create: (
    chatbotId: string,
    input: CreateKnowledgeSourceInput,
  ): Promise<KnowledgeSourceResponse> =>
    apiRequest<KnowledgeSourceResponse>(`/api/v1/knowledge-sources/${chatbotId}`, {
      method: "POST",
      body: input,
    }),

  list: (chatbotId: string): Promise<KnowledgeSourceListResponse> =>
    apiRequest<KnowledgeSourceListResponse>(`/api/v1/knowledge-sources/${chatbotId}`),
};
