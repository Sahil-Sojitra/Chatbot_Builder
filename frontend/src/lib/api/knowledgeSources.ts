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

export interface InitiateFileUploadInput {
  originalName: string;
  mimeType: string;
}

export interface InitiateFileUploadResponse {
  uploadId: string;
  uploadUrl: string;
  expiresIn: number;
}

export interface CompleteFileUploadInput {
  uploadId: string;
}

/**
 * Thin wrapper over the backend's real, already-implemented knowledge-source
 * endpoints (backend/src/modules/knowledge-sources).
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

  initiateUpload: (
    chatbotId: string,
    input: InitiateFileUploadInput,
  ): Promise<InitiateFileUploadResponse> =>
    apiRequest<InitiateFileUploadResponse>(
      `/api/v1/knowledge-sources/${chatbotId}/upload`,
      {
        method: "POST",
        body: input,
      },
    ),

  uploadToStorage: async (
    uploadUrl: string,
    file: File | Blob,
    mimeType: string,
  ): Promise<void> => {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error("Failed to upload file to storage. Please try again.");
    }
  },

  completeUpload: (
    chatbotId: string,
    input: CompleteFileUploadInput,
  ): Promise<KnowledgeSourceResponse> =>
    apiRequest<KnowledgeSourceResponse>(
      `/api/v1/knowledge-sources/${chatbotId}/upload/complete`,
      {
        method: "POST",
        body: input,
      },
    ),

  list: (chatbotId: string): Promise<KnowledgeSourceListResponse> =>
    apiRequest<KnowledgeSourceListResponse>(`/api/v1/knowledge-sources/${chatbotId}`),
};
