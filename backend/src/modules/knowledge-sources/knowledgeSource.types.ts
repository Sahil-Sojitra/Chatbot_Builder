import type { IKnowledgeSource } from "./knowledgeSource.model.js";

export interface PublicKnowledgeSource {
  id: string;
  chatbotId: string;
  type: IKnowledgeSource["type"];
  name: string;
  status: IKnowledgeSource["status"];

  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  storageKey: string | null;
  sourceUrl: string | null;
  sourceText: string | null;

  title: string | null;
  author: string | null;
  language: string | null;
  contentType: string | null;

  lastProcessedAt: string | null;
  error: string | null;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
