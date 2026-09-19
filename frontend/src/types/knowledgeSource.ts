export type KnowledgeSourceType = "FILE" | "URL" | "WEBPAGE" | "TEXT";
export type KnowledgeSourceStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED" | "DISABLED";

/**
 * Mirrors the backend's client-facing shape exactly (backend/src/modules/
 * knowledge-sources/knowledgeSource.service.ts `ClientFacingKnowledgeSource`)
 * — `storageKey` and `error` are internal details the backend deliberately
 * never sends to the client, so they don't appear here either.
 */
export interface KnowledgeSource {
  id: string;
  chatbotId: string;
  type: KnowledgeSourceType;
  name: string;
  status: KnowledgeSourceStatus;

  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sourceUrl: string | null;
  sourceText: string | null;

  title: string | null;
  author: string | null;
  language: string | null;
  contentType: string | null;

  lastProcessedAt: string | null;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
