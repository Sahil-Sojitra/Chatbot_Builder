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

/** Whitelisted, already-validated fields a PATCH is allowed to `$set`. */
export interface UpdateChatbotFields {
  name?: string;
  description?: string;
  systemPrompt?: string;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  ragEnabled?: boolean;
  ragTopK?: number;
  ragSimilarityThreshold?: number;
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

  /**
   * Applies a partial `$set` to a chatbot, scoped to both its id and its
   * organization. Returns null when nothing matches (wrong id, or the
   * chatbot belongs to another organization) — the caller cannot tell the
   * two apart. Only explicitly-allowed fields ever reach here.
   */
  async updateByIdForOrganization(
    id: string,
    organizationId: Types.ObjectId,
    fields: UpdateChatbotFields,
  ): Promise<HydratedDocument<IChatbot> | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return ChatbotModel.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: fields },
      { new: true },
    );
  },

  /**
   * Marks a chatbot ACTIVE, scoped to both its id and its organization.
   * Only status/publishedBy/publishedAt are touched — slug, publicId,
   * organizationId, createdBy and every configuration field are left as-is.
   * Returns null when nothing matches (wrong id, or another organization's
   * chatbot). Re-publishing an already-ACTIVE chatbot is accepted and simply
   * refreshes publishedBy/publishedAt.
   */
  async publishByIdForOrganization(
    id: string,
    organizationId: Types.ObjectId,
    publishedBy: Types.ObjectId,
  ): Promise<HydratedDocument<IChatbot> | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return ChatbotModel.findOneAndUpdate(
      { _id: id, organizationId },
      { $set: { status: "ACTIVE", publishedBy, publishedAt: new Date() } },
      { new: true },
    );
  },

  async create(
    input: CreateChatbotInput,
  ): Promise<HydratedDocument<IChatbot>> {
    return ChatbotModel.create(input);
  },
};
