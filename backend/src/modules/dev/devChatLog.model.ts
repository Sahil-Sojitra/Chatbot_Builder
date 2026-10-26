import mongoose, { Schema, Document } from "mongoose";

export interface IDevChatLogSource {
  title?: string;
  url?: string;
  snippet?: string;
  score?: number;
  chunk_id?: string;
}

export interface IDevChatLogStats {
  retrieval_duration_ms?: number;
  generation_duration_ms?: number;
  total_duration_ms?: number;
  model_used?: string;
  chunks_retrieved?: number;
}

export interface IDevChatLog extends Document {
  chatbotId: mongoose.Types.ObjectId;
  chatbotName?: string;
  publicId?: string;
  question: string;
  answer: string;
  hasGroundedEvidence: boolean;
  sources: IDevChatLogSource[];
  stats?: IDevChatLogStats;
  isFlagged: boolean;
  flagReason?: string;
  isTestChat: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DevChatLogSchema = new Schema<IDevChatLog>(
  {
    chatbotId: {
      type: Schema.Types.ObjectId,
      ref: "Chatbot",
      required: true,
      index: true,
    },
    chatbotName: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      index: true,
      trim: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    hasGroundedEvidence: {
      type: Boolean,
      default: false,
      index: true,
    },
    sources: [
      {
        title: { type: String },
        url: { type: String },
        snippet: { type: String },
        score: { type: Number },
        chunk_id: { type: String },
      },
    ],
    stats: {
      retrieval_duration_ms: { type: Number },
      generation_duration_ms: { type: Number },
      total_duration_ms: { type: Number },
      model_used: { type: String },
      chunks_retrieved: { type: Number },
    },
    isFlagged: {
      type: Boolean,
      default: false,
      index: true,
    },
    flagReason: {
      type: String,
      trim: true,
    },
    isTestChat: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "dev_chat_logs",
  },
);

// High-speed compound index for developer dashboard live queries
DevChatLogSchema.index({ createdAt: -1, isFlagged: 1 });
DevChatLogSchema.index({ chatbotId: 1, createdAt: -1 });

export const DevChatLogModel =
  mongoose.models.DevChatLog ||
  mongoose.model<IDevChatLog>("DevChatLog", DevChatLogSchema);
