import { Schema, Types, model } from "mongoose";

export type ChatbotStatus = "DRAFT" | "ACTIVE" | "PAUSED";
export type ChatbotCreationMode = "INSTANT" | "CUSTOM";

export interface IChatbot {
  organizationId: Types.ObjectId;
  name: string;
  slug: string;
  description: string | null;
  status: ChatbotStatus;
  creationMode: ChatbotCreationMode;
  publicId: string;
  systemPrompt: string | null;
  provider: string | null;
  model: string | null;
  apiKey: string | null;
  temperature: number | null;
  maxTokens: number | null;
  sessionMessageLimit: number | null;
  ragEnabled: boolean;
  ragTopK: number | null;
  ragSimilarityThreshold: number | null;
  starterQuestions?: string[];
  uiConfig: Record<string, unknown> | null;
  createdBy: Types.ObjectId;
  publishedBy: Types.ObjectId | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const chatbotSchema = new Schema<IChatbot>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: ["DRAFT", "ACTIVE", "PAUSED"],
      default: "DRAFT",
      required: true,
    },

    creationMode: {
      type: String,
      enum: ["INSTANT", "CUSTOM"],
      default: "CUSTOM",
      required: true,
    },

    publicId: {
      type: String,
      required: true,
      unique: true,
    },

    systemPrompt: {
      type: String,
      default: null,
    },

    provider: {
      type: String,
      default: null,
    },

    model: {
      type: String,
      default: null,
    },

    apiKey: {
      type: String,
      default: null,
    },

    temperature: {
      type: Number,
      default: null,
    },

    maxTokens: {
      type: Number,
      default: null,
    },

    sessionMessageLimit: {
      type: Number,
      default: null,
    },

    ragEnabled: {
      type: Boolean,
      default: false,
      required: true,
    },

    ragTopK: {
      type: Number,
      default: null,
    },

    ragSimilarityThreshold: {
      type: Number,
      default: null,
    },

    starterQuestions: {
      type: [String],
      default: [],
    },

    uiConfig: {
      type: Schema.Types.Mixed,
      default: null,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Slug only needs to be unique within an organization, not globally.
chatbotSchema.index({ organizationId: 1, slug: 1 }, { unique: true });

export const ChatbotModel = model<IChatbot>("Chatbot", chatbotSchema);
