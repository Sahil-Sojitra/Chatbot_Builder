import { Schema, Types, model } from "mongoose";

export type KnowledgeSourceType = "FILE" | "URL" | "WEBPAGE" | "TEXT";

export type KnowledgeSourceStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY"
  | "FAILED"
  | "DISABLED";

export interface IKnowledgeSource {
  chatbotId: Types.ObjectId;
  type: KnowledgeSourceType;
  name: string;
  status: KnowledgeSourceStatus;

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

  lastProcessedAt: Date | null;
  error: string | null;

  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const knowledgeSourceSchema = new Schema<IKnowledgeSource>(
  {
    chatbotId: {
      type: Schema.Types.ObjectId,
      ref: "Chatbot",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["FILE", "URL", "WEBPAGE", "TEXT"],
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "PROCESSING", "READY", "FAILED", "DISABLED"],
      default: "PENDING",
      required: true,
    },

    originalName: {
      type: String,
      trim: true,
      default: null,
    },

    mimeType: {
      type: String,
      trim: true,
      default: null,
    },

    sizeBytes: {
      type: Number,
      default: null,
    },

    storageKey: {
      type: String,
      default: null,
    },

    sourceUrl: {
      type: String,
      trim: true,
      default: null,
    },

    sourceText: {
      type: String,
      default: null,
    },

    title: {
      type: String,
      trim: true,
      default: null,
    },

    author: {
      type: String,
      trim: true,
      default: null,
    },

    language: {
      type: String,
      trim: true,
      default: null,
    },

    contentType: {
      type: String,
      trim: true,
      default: null,
    },

    lastProcessedAt: {
      type: Date,
      default: null,
    },

    error: {
      type: String,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export const KnowledgeSourceModel = model<IKnowledgeSource>(
  "KnowledgeSource",
  knowledgeSourceSchema,
);
