import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

import { PendingUploadModel } from "./pendingUpload.model.js";
import type { IPendingUpload } from "./pendingUpload.model.js";

export interface CreatePendingUploadInput {
  chatbotId: Types.ObjectId;
  createdBy: Types.ObjectId;
  originalName: string;
  mimeType: string;
  storageKey: string;
  expiresAt: Date;
}

export const pendingUploadRepository = {
  async create(
    input: CreatePendingUploadInput,
  ): Promise<HydratedDocument<IPendingUpload>> {
    return PendingUploadModel.create(input);
  },

  /**
   * Atomically claims (deletes) a pending upload scoped to its chatbot and
   * not yet expired. The delete-on-match means the same uploadId can never
   * be completed twice, even under concurrent requests — a second caller
   * simply finds nothing.
   */
  async claimPendingByIdForChatbot(
    id: string,
    chatbotId: Types.ObjectId,
  ): Promise<HydratedDocument<IPendingUpload> | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return PendingUploadModel.findOneAndDelete({
      _id: id,
      chatbotId,
      expiresAt: { $gt: new Date() },
    });
  },
};
