import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

import { KnowledgeSourceModel } from "./knowledgeSource.model.js";
import type {
  IKnowledgeSource,
  KnowledgeSourceType,
} from "./knowledgeSource.model.js";

export interface CreateKnowledgeSourceInput {
  chatbotId: Types.ObjectId;
  type: KnowledgeSourceType;
  name: string;
  sourceUrl?: string;
  sourceText?: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  storageKey?: string;
  createdBy: Types.ObjectId;
}

export const knowledgeSourceRepository = {
  async create(
    input: CreateKnowledgeSourceInput,
  ): Promise<HydratedDocument<IKnowledgeSource>> {
    return KnowledgeSourceModel.create(input);
  },

  /**
   * Fetches a single knowledge source scoped to its chatbot. Both the id and
   * the chatbotId must match — knowing an id is never sufficient to read a
   * knowledge source belonging to another chatbot.
   */
  async findByIdForChatbot(
    sourceId: string,
    chatbotId: Types.ObjectId,
  ): Promise<HydratedDocument<IKnowledgeSource> | null> {
    if (!Types.ObjectId.isValid(sourceId) || !Types.ObjectId.isValid(chatbotId)) {
      return null;
    }
    return KnowledgeSourceModel.findOne({ _id: sourceId, chatbotId });
  },

  async findAllForChatbot(
    chatbotId: Types.ObjectId,
  ): Promise<HydratedDocument<IKnowledgeSource>[]> {
    return KnowledgeSourceModel.find({ chatbotId }).sort({ createdAt: -1 });
  },
};
