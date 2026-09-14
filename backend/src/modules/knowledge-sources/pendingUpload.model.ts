import { Schema, Types, model } from "mongoose";

/**
 * Short-lived record binding a client-facing upload identifier to a
 * backend-generated R2 storage key. Created when a FILE upload is
 * initiated and consumed (deleted) exactly once when the upload is
 * completed — this is the only place the storageKey for an in-flight
 * upload is ever stored, so the client never sees or chooses it directly.
 */
export interface IPendingUpload {
  chatbotId: Types.ObjectId;
  createdBy: Types.ObjectId;
  originalName: string;
  mimeType: string;
  storageKey: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pendingUploadSchema = new Schema<IPendingUpload>(
  {
    chatbotId: {
      type: Schema.Types.ObjectId,
      ref: "Chatbot",
      required: true,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
    },

    mimeType: {
      type: String,
      required: true,
      trim: true,
    },

    storageKey: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/** MongoDB TTL index — expired pending uploads are reaped automatically. */
pendingUploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PendingUploadModel = model<IPendingUpload>(
  "PendingUpload",
  pendingUploadSchema,
);
