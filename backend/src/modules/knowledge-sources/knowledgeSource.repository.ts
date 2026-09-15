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

  /**
   * Atomically claims a knowledge source for ingestion: only succeeds if it
   * is currently PENDING, and flips it straight to PROCESSING in the same
   * findOneAndUpdate. This is the actual concurrency guard — MongoDB
   * resolves the filter+update atomically, so if two workers (or two
   * duplicate jobs) race on the same id, only one findOneAndUpdate matches
   * the still-PENDING document; the other finds nothing to update and gets
   * null. Never rely on BullMQ job-uniqueness alone for this.
   */
  async claimForProcessing(
    id: string,
  ): Promise<HydratedDocument<IKnowledgeSource> | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return KnowledgeSourceModel.findOneAndUpdate(
      { _id: id, status: "PENDING" },
      { $set: { status: "PROCESSING" } },
      { new: true },
    );
  },

  /**
   * Marks a knowledge source READY after successful content acquisition.
   * Scoped to only apply from PROCESSING, so it can't clobber a source that
   * moved on (or was disabled) by the time acquisition finished.
   */
  async markReady(
    id: string,
  ): Promise<HydratedDocument<IKnowledgeSource> | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return KnowledgeSourceModel.findOneAndUpdate(
      { _id: id, status: "PROCESSING" },
      { $set: { status: "READY", lastProcessedAt: new Date(), error: null } },
      { new: true },
    );
  },

  /**
   * Marks a knowledge source FAILED after a content-acquisition error.
   * Scoped to only apply from PROCESSING, for the same reason as
   * markReady(). The stored error is an internal diagnostic message, never
   * surfaced verbatim to API responses.
   */
  async markFailed(
    id: string,
    errorMessage: string,
  ): Promise<HydratedDocument<IKnowledgeSource> | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return KnowledgeSourceModel.findOneAndUpdate(
      { _id: id, status: "PROCESSING" },
      {
        $set: {
          status: "FAILED",
          lastProcessedAt: new Date(),
          error: errorMessage,
        },
      },
      { new: true },
    );
  },

};
