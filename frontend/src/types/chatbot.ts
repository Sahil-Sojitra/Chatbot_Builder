/** Mirrors backend/src/modules/chatbots/chatbot.types.ts PublicChatbot. */
export type ChatbotStatus = "DRAFT" | "ACTIVE" | "PAUSED";
export type ChatbotCreationMode = "INSTANT" | "CUSTOM";

export interface Chatbot {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  status: ChatbotStatus;
  creationMode: ChatbotCreationMode;
  publicId: string;
  systemPrompt: string | null;
  provider: string | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  ragEnabled: boolean;
  ragTopK: number | null;
  ragSimilarityThreshold: number | null;
  starterQuestions?: string[];
  uiConfig: Record<string, unknown> | null;
  createdBy: string;
  publishedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
