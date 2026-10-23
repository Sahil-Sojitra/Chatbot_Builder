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

export interface UpdateKnowledgeSourceInput {
  name?: string;
  sourceText?: string;
}

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
  ): Promise<KnowledgeSourceResponse> => {
    const trimmedId = chatbotId?.trim();
    if (!trimmedId) {
      return Promise.reject(new Error("Chatbot ID is required to create a knowledge source."));
    }
    return apiRequest<KnowledgeSourceResponse>(`/api/v1/knowledge-sources/${trimmedId}`, {
      method: "POST",
      body: input,
    });
  },

  initiateUpload: (
    chatbotId: string,
    input: InitiateFileUploadInput,
  ): Promise<InitiateFileUploadResponse> => {
    const trimmedId = chatbotId?.trim();
    if (!trimmedId) {
      return Promise.reject(new Error("Chatbot ID is required to initiate upload."));
    }
    return apiRequest<InitiateFileUploadResponse>(
      `/api/v1/knowledge-sources/${trimmedId}/upload`,
      {
        method: "POST",
        body: input,
      },
    );
  },

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
  ): Promise<KnowledgeSourceResponse> => {
    const trimmedId = chatbotId?.trim();
    if (!trimmedId) {
      return Promise.reject(new Error("Chatbot ID is required to complete upload."));
    }
    return apiRequest<KnowledgeSourceResponse>(
      `/api/v1/knowledge-sources/${trimmedId}/upload/complete`,
      {
        method: "POST",
        body: input,
      },
    );
  },

  list: (chatbotId?: string | null): Promise<KnowledgeSourceListResponse> => {
    const trimmedId = chatbotId?.trim();
    if (!trimmedId) {
      return Promise.resolve({ knowledgeSources: [] });
    }
    return apiRequest<KnowledgeSourceListResponse>(`/api/v1/knowledge-sources/${trimmedId}`);
  },

  get: (chatbotId: string, sourceId: string): Promise<KnowledgeSourceResponse> => {
    const trimmedId = chatbotId?.trim();
    if (!trimmedId || !sourceId?.trim()) {
      return Promise.reject(new Error("Chatbot ID and Source ID are required."));
    }
    return apiRequest<KnowledgeSourceResponse>(`/api/v1/knowledge-sources/${trimmedId}/${sourceId.trim()}`);
  },

  update: (
    chatbotId: string,
    sourceId: string,
    input: UpdateKnowledgeSourceInput,
  ): Promise<KnowledgeSourceResponse> => {
    const trimmedId = chatbotId?.trim();
    if (!trimmedId || !sourceId?.trim()) {
      return Promise.reject(new Error("Chatbot ID and Source ID are required."));
    }
    return apiRequest<KnowledgeSourceResponse>(
      `/api/v1/knowledge-sources/${trimmedId}/${sourceId.trim()}`,
      {
        method: "PATCH",
        body: input,
      },
    );
  },

  delete: (
    chatbotId: string,
    sourceId: string,
  ): Promise<{ deleted: boolean }> => {
    const trimmedId = chatbotId?.trim();
    if (!trimmedId || !sourceId?.trim()) {
      return Promise.reject(new Error("Chatbot ID and Source ID are required."));
    }
    return apiRequest<{ deleted: boolean }>(
      `/api/v1/knowledge-sources/${trimmedId}/${sourceId.trim()}`,
      {
        method: "DELETE",
      },
    );
  },
};
