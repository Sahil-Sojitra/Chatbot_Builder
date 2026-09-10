import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

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

  async findByOrganizationId(
    organizationId: Types.ObjectId,
  ): Promise<HydratedDocument<IChatbot>[]> {
    return ChatbotModel.find({ organizationId }).sort({ createdAt: -1 });
  },

  /**
   * Fetches a single chatbot scoped to its organization. Both the id and the
   * organization must match — knowing an id is never sufficient to read
   * another organization's chatbot.
   */
  async findByIdForOrganization(
    id: string,
    organizationId: Types.ObjectId,
  ): Promise<HydratedDocument<IChatbot> | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return ChatbotModel.findOne({ _id: id, organizationId });
  },

  async create(
    input: CreateChatbotInput,
  ): Promise<HydratedDocument<IChatbot>> {
    return ChatbotModel.create(input);
  },
};
