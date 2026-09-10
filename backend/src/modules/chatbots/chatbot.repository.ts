import type { HydratedDocument, Types } from "mongoose";

import { ChatbotModel } from "./chatbot.model.js";
import type { IChatbot } from "./chatbot.model.js";

export interface CreateChatbotInput {
  organizationId: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  publicId: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  ragEnabled: boolean;
  ragTopK?: number;
  ragSimilarityThreshold?: number;
  createdBy: Types.ObjectId;
}

export const chatbotRepository = {
  async slugExistsForOrganization(
    organizationId: Types.ObjectId,
    slug: string,
  ): Promise<boolean> {
    const existing = await ChatbotModel.exists({ organizationId, slug });
    return existing !== null;
  },

  async publicIdExists(publicId: string): Promise<boolean> {
    const existing = await ChatbotModel.exists({ publicId });
    return existing !== null;
  },

  async create(
    input: CreateChatbotInput,
  ): Promise<HydratedDocument<IChatbot>> {
    return ChatbotModel.create(input);
  },
};
