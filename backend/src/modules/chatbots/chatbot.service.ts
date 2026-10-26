import crypto from "node:crypto";

import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

import {
  AppError,
  chatbotNotFound,
  chatbotNotPublished,
  organizationNotFound,
} from "../../shared/errors.js";
import { aiServiceClient, AIServiceError } from "../../shared/aiServiceClient.js";
import { encryptSecret, decryptSecret } from "../../shared/encryption.js";
import { deleteObject } from "../../shared/storage.js";
import { generateUniqueSlug } from "../../shared/slug.js";
import { organizationRepository } from "../organizations/organization.repository.js";
import { knowledgeSourceRepository } from "../knowledge-sources/knowledgeSource.repository.js";
import { chatbotRepository } from "./chatbot.repository.js";
import { DevChatLogModel } from "../dev/devChatLog.model.js";
import type {
  CreateChatbotInput as RepositoryCreateChatbotInput,
  UpdateChatbotFields,
} from "./chatbot.repository.js";
import type { IChatbot } from "./chatbot.model.js";
import type {
  ChatMessageInput,
  ChatResponseData,
  CreateChatbotInput,
  PublicChatbot,
  UpdateChatbotInput,
} from "./chatbot.types.js";

/** 128 bits of randomness, URL-safe — suitable for a public-facing identifier. */
const generatePublicId = (): string => crypto.randomBytes(16).toString("base64url");

const generateUniquePublicId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generatePublicId();
    if (!(await chatbotRepository.publicIdExists(candidate))) {
      return candidate;
    }
  }
  // Astronomically unlikely to be reached at 128 bits of entropy, but keep
  // the guarantee explicit rather than assuming the loop always succeeds.
  return `${generatePublicId()}${crypto.randomUUID()}`;
};

const toPublicChatbot = (
  chatbot: HydratedDocument<IChatbot>,
): PublicChatbot => {
  const hasKey = Boolean(chatbot.apiKey);

  return {
    id: chatbot._id.toString(),
    organizationId: chatbot.organizationId.toString(),
    name: chatbot.name,
    slug: chatbot.slug,
    description: chatbot.description,
    status: chatbot.status,
    creationMode: chatbot.creationMode ?? "CUSTOM",
    publicId: chatbot.publicId,
    systemPrompt: chatbot.systemPrompt,
    provider: chatbot.provider,
    model: chatbot.model,
    hasApiKey: hasKey,
    temperature: chatbot.temperature,
    maxTokens: chatbot.maxTokens,
    sessionMessageLimit: chatbot.sessionMessageLimit ?? null,
    ragEnabled: chatbot.ragEnabled,
    ragTopK: chatbot.ragTopK,
    ragSimilarityThreshold: chatbot.ragSimilarityThreshold,
    starterQuestions: chatbot.starterQuestions ?? [],
    uiConfig: chatbot.uiConfig,
    createdBy: chatbot.createdBy.toString(),
    publishedBy: chatbot.publishedBy ? chatbot.publishedBy.toString() : null,
    publishedAt: chatbot.publishedAt ? chatbot.publishedAt.toISOString() : null,
    createdAt: chatbot.createdAt.toISOString(),
    updatedAt: chatbot.updatedAt.toISOString(),
  };
};

export const chatbotService = {
  /**
   * Creates a chatbot under the authenticated user's organization. The
   * organization is always resolved server-side from ownerId — a client
   * can never supply organizationId directly. Starts as DRAFT;
   * publishedBy/publishedAt are never set here.
   */
  async createForOwner(
    ownerId: string,
    input: CreateChatbotInput,
  ): Promise<PublicChatbot> {
    const organization = await organizationRepository.findByOwnerId(ownerId);
    if (!organization) {
      throw organizationNotFound();
    }

    const slug = await generateUniqueSlug(input.name, (candidate) =>
      chatbotRepository.slugExistsForOrganization(organization._id, candidate),
    );
    const publicId = await generateUniquePublicId();

    const creationInput: RepositoryCreateChatbotInput = {
      organizationId: organization._id,
      name: input.name,
      slug,
      publicId,
      ragEnabled: input.ragEnabled ?? false,
      creationMode: input.creationMode ?? "CUSTOM",
      createdBy: new Types.ObjectId(ownerId),
    };
    if (input.description !== undefined) {
      creationInput.description = input.description;
    }
    if (input.systemPrompt !== undefined) {
      creationInput.systemPrompt = input.systemPrompt;
    }
    if (input.provider !== undefined) {
      creationInput.provider = input.provider;
    }
    if (input.model !== undefined) {
      creationInput.model = input.model;
    }
    if (input.apiKey !== undefined) {
      creationInput.apiKey = input.apiKey?.trim() ? encryptSecret(input.apiKey.trim()) : null;
    }
    if (input.temperature !== undefined) {
      creationInput.temperature = input.temperature;
    }
    if (input.maxTokens !== undefined) {
      creationInput.maxTokens = input.maxTokens;
    }
    if (input.sessionMessageLimit !== undefined) {
      creationInput.sessionMessageLimit = input.sessionMessageLimit;
    }
    if (input.ragTopK !== undefined) {
      creationInput.ragTopK = input.ragTopK;
    }
    if (input.ragSimilarityThreshold !== undefined) {
      creationInput.ragSimilarityThreshold = input.ragSimilarityThreshold;
    }
    if (input.starterQuestions !== undefined) {
      creationInput.starterQuestions = input.starterQuestions;
    }

    const chatbot = await chatbotRepository.create(creationInput);

    return toPublicChatbot(chatbot);
  },

  /**
   * Lists every chatbot under the authenticated user's organization. The
   * organization is always resolved server-side from ownerId — a client can
   * never supply organizationId. Returns 404 if the user owns no
   * organization; returns an empty array when the organization has no
   * chatbots. Ordered newest first.
   */
  async listForOwner(ownerId: string): Promise<PublicChatbot[]> {
    const organization = await organizationRepository.findByOwnerId(ownerId);
    if (!organization) {
      throw organizationNotFound();
    }

    const chatbots = await chatbotRepository.findByOrganizationId(
      organization._id,
    );

    return chatbots.map(toPublicChatbot);
  },

  /**
   * Fetches one chatbot by id, scoped to the authenticated user's
   * organization. Returns 404 if the user owns no organization, or if the
   * chatbot does not exist within that organization — a client knowing an
   * id can never read another organization's chatbot.
   */
  async getForOwner(ownerId: string, chatbotId: string): Promise<PublicChatbot> {
    const organization = await organizationRepository.findByOwnerId(ownerId);
    if (!organization) {
      throw organizationNotFound();
    }

    const chatbot = await chatbotRepository.findByIdForOrganization(
      chatbotId,
      organization._id,
    );
    if (!chatbot) {
      throw chatbotNotFound();
    }

    return toPublicChatbot(chatbot);
  },

  /**
   * Applies a partial update to one chatbot, scoped to the authenticated
   * user's organization. The update object is built explicitly from the
   * validated input — the request body is never spread into the query, and
   * slug/status/publicId/organizationId/createdBy and the publishing fields
   * are never touched. A name change does NOT regenerate the slug: the slug
   * is a stable identifier fixed at creation. Returns 404 when the user
   * owns no organization, or when the chatbot is not in that organization.
   */
  async updateForOwner(
    ownerId: string,
    chatbotId: string,
    input: UpdateChatbotInput,
  ): Promise<PublicChatbot> {
    const organization = await organizationRepository.findByOwnerId(ownerId);
    if (!organization) {
      throw organizationNotFound();
    }

    const fields: UpdateChatbotFields = {};
    if (input.name !== undefined) {
      fields.name = input.name;
    }
    if (input.description !== undefined) {
      fields.description = input.description;
    }
    if (input.systemPrompt !== undefined) {
      fields.systemPrompt = input.systemPrompt;
    }
    if (input.provider !== undefined) {
      fields.provider = input.provider;
    }
    if (input.model !== undefined) {
      fields.model = input.model;
    }
    if (input.apiKey !== undefined) {
      fields.apiKey = input.apiKey?.trim() ? encryptSecret(input.apiKey.trim()) : null;
    }
    if (input.temperature !== undefined) {
      fields.temperature = input.temperature;
    }
    if (input.maxTokens !== undefined) {
      fields.maxTokens = input.maxTokens;
    }
    if (input.sessionMessageLimit !== undefined) {
      fields.sessionMessageLimit = input.sessionMessageLimit;
    }
    if (input.ragEnabled !== undefined) {
      fields.ragEnabled = input.ragEnabled;
    }
    if (input.ragTopK !== undefined) {
      fields.ragTopK = input.ragTopK;
    }
    if (input.ragSimilarityThreshold !== undefined) {
      fields.ragSimilarityThreshold = input.ragSimilarityThreshold;
    }
    if (input.starterQuestions !== undefined) {
      fields.starterQuestions = input.starterQuestions;
    }

    const chatbot = await chatbotRepository.updateByIdForOrganization(
      chatbotId,
      organization._id,
      fields,
    );
    if (!chatbot) {
      throw chatbotNotFound();
    }

    return toPublicChatbot(chatbot);
  },

  /**
   * Publishes one chatbot (status → ACTIVE, publishedBy → caller,
   * publishedAt → now), scoped to the authenticated user's organization.
   * Idempotent: publishing an already-ACTIVE chatbot succeeds and refreshes
   * the publish metadata. Returns 404 when the user owns no organization,
   * or when the chatbot is not in that organization. slug, publicId,
   * organizationId, createdBy and all AI/RAG/UI config are left untouched;
   * no AI provider is called and no new resource is created.
   */
  async publishForOwner(
    ownerId: string,
    chatbotId: string,
  ): Promise<PublicChatbot> {
    const organization = await organizationRepository.findByOwnerId(ownerId);
    if (!organization) {
      throw organizationNotFound();
    }

    const chatbot = await chatbotRepository.publishByIdForOrganization(
      chatbotId,
      organization._id,
      new Types.ObjectId(ownerId),
    );
    if (!chatbot) {
      throw chatbotNotFound();
    }

    return toPublicChatbot(chatbot);
  },

  /**
   * Unpublishes one chatbot (status → PAUSED), scoped to the authenticated
   * user's organization. Lifecycle only: ACTIVE → PAUSED. An already-PAUSED
   * chatbot is accepted idempotently. A DRAFT chatbot has never been
   * published, so it is rejected with a 409 state-transition error rather
   * than being silently moved to PAUSED. publishedBy/publishedAt are kept
   * as the last-publication metadata; no other field is touched, and no
   * deploy/widget/AI side effect occurs. Returns 404 when the user owns no
   * organization, or when the chatbot is not in that organization.
   */
  async unpublishForOwner(
    ownerId: string,
    chatbotId: string,
  ): Promise<PublicChatbot> {
    const organization = await organizationRepository.findByOwnerId(ownerId);
    if (!organization) {
      throw organizationNotFound();
    }

    const existing = await chatbotRepository.findByIdForOrganization(
      chatbotId,
      organization._id,
    );
    if (!existing) {
      throw chatbotNotFound();
    }
    if (existing.status === "DRAFT") {
      throw chatbotNotPublished();
    }

    const chatbot = await chatbotRepository.unpublishByIdForOrganization(
      chatbotId,
      organization._id,
    );
    if (!chatbot) {
      throw chatbotNotFound();
    }

    return toPublicChatbot(chatbot);
  },

  /**
   * Submits a question to the chatbot's knowledge base via the FastAPI AI service.
   * Scoped to the authenticated user's organization.
   * If the chatbot is an Instant Bot, verifies that website ingestion has succeeded (READY).
   */
  async chatForOwner(
    ownerId: string,
    chatbotId: string,
    input: ChatMessageInput,
  ): Promise<ChatResponseData> {
    const organization = await organizationRepository.findByOwnerId(ownerId);
    if (!organization) {
      throw organizationNotFound();
    }

    const chatbot = await chatbotRepository.findByIdForOrganization(
      chatbotId,
      organization._id,
    );
    if (!chatbot) {
      throw chatbotNotFound();
    }

    const sources = await knowledgeSourceRepository.findAllForChatbot(chatbot._id);
    const websiteSource =
      sources.find((s) => (s.type === "URL" || s.type === "WEBPAGE") && s.sourceUrl) ||
      sources.find((s) => s.sourceUrl) ||
      sources[0];

    // Ingestion readiness gate for Instant Bots
    if (chatbot.creationMode === "INSTANT") {
      if (!websiteSource) {
        throw new AppError(
          400,
          "INVALID_STATE_TRANSITION",
          "Website knowledge source has not been initialized for this Instant Bot.",
        );
      }

      if (websiteSource.status === "FAILED") {
        throw new AppError(
          400,
          "INGESTION_FAILED",
          `Website ingestion failed: ${websiteSource.error || "Indexing failed"}. Please retry website indexing before chatting.`,
        );
      }

      if (websiteSource.status !== "READY") {
        throw new AppError(
          409,
          "INVALID_STATE_TRANSITION",
          "Website indexing is still in progress. Please wait until ingestion is ready.",
        );
      }
    }

    const question = (input.message || input.question || "").trim();
    const websiteUrl = websiteSource?.sourceUrl || undefined;

    try {
      const rawApiKey = chatbot.apiKey ? decryptSecret(chatbot.apiKey) : undefined;

      const qaResponse = await aiServiceClient.askQuestion({
        chatbotId: chatbot._id.toString(),
        question,
        botName: chatbot.name,
        websiteUrl,
        systemPrompt: chatbot.systemPrompt || undefined,
        topK: input.topK ?? chatbot.ragTopK ?? 8,
        llmProvider: chatbot.provider || undefined,
        llmModel: chatbot.model || undefined,
        llmApiKey: rawApiKey || undefined,
        chatHistory: input.chatHistory || input.chat_history,
      });

      return {
        answer: qaResponse.answer,
        sources: qaResponse.sources,
        hasGroundedEvidence: qaResponse.has_grounded_evidence,
        stats: qaResponse.stats,
      };
    } catch (err: unknown) {
      // Soft fallback for chat conversation so users never experience a broken UI error
      console.warn("AI service chat communication encountered an error, returning soft fallback response", {
        chatbotId: chatbot._id.toString(),
        error: err instanceof Error ? err.message : String(err),
      });

      return {
        answer:
          "We are currently experiencing a brief delay connecting to our service. Please try asking your question again in a moment, or feel free to explore our website directly.",
        sources: [],
        hasGroundedEvidence: false,
        stats: {
          retrieval_duration_ms: 0,
          generation_duration_ms: 0,
          total_duration_ms: 0,
          model_used: "fallback-graceful",
          chunks_retrieved: 0,
        },
      };
    }
  },


  /**
   * Permanently deletes one chatbot and cleans up its knowledge sources,
   * S3 files, and vector store content, scoped to the user's organization.
   */
  async deleteForOwner(ownerId: string, chatbotId: string): Promise<void> {
    const organization = await organizationRepository.findByOwnerId(ownerId);
    if (!organization) {
      throw organizationNotFound();
    }

    const chatbot = await chatbotRepository.findByIdForOrganization(
      chatbotId,
      organization._id,
    );
    if (!chatbot) {
      throw chatbotNotFound();
    }

    // 1. Clean up attached knowledge sources & S3 storage files
    const sources = await knowledgeSourceRepository.findAllForChatbot(chatbot._id);
    for (const source of sources) {
      if (source.storageKey) {
        await deleteObject(source.storageKey);
      }
    }
    await knowledgeSourceRepository.deleteAllForChatbot(chatbot._id);

    // 2. Clean up vector index in AI service
    await aiServiceClient.deleteChatbotContent(chatbot._id.toString());

    // 3. Delete the chatbot document
    await chatbotRepository.deleteByIdForOrganization(chatbotId, organization._id);
  },

  /**
   * Retrieves public branding, configuration, and starter questions for an
   * embedded widget by publicId. Open to the public.
   */
  async getPublicConfig(publicId: string) {
    const chatbot = await chatbotRepository.findByPublicId(publicId);
    if (!chatbot) {
      throw chatbotNotFound();
    }

    const sources = await knowledgeSourceRepository.findAllForChatbot(chatbot._id);
    const websiteSource =
      sources.find((s) => (s.type === "URL" || s.type === "WEBPAGE") && s.sourceUrl) ||
      sources.find((s) => s.sourceUrl) ||
      sources[0];

    // Compute clean brand name if chatbot.name is raw ObjectId or hex
    let displayName = chatbot.name;
    const rawName = chatbot.name || "";
    if (
      /^[0-9a-fA-F]{24}(\s+AI\s+Assistant)?$/i.test(rawName.trim()) ||
      /^[0-9a-fA-F-]{32,36}/i.test(rawName.trim())
    ) {
      if (websiteSource?.sourceUrl) {
        try {
          const parsed = new URL(websiteSource.sourceUrl);
          const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
          const brand = host.split(".")[0];
          displayName = brand ? `${brand.charAt(0).toUpperCase() + brand.slice(1)} Assistant` : "Website Assistant";
        } catch {
          displayName = "Website Assistant";
        }
      } else {
        displayName = "AI Assistant";
      }
    }

    return {
      publicId: chatbot.publicId,
      name: displayName,
      rawName: chatbot.name,
      description: chatbot.description || `AI Assistant for ${displayName}`,
      status: chatbot.status,
      isPublished: chatbot.status === "ACTIVE",
      creationMode: chatbot.creationMode,
      starterQuestions:
        chatbot.starterQuestions && chatbot.starterQuestions.length > 0
          ? chatbot.starterQuestions
          : [
              "What services do you offer?",
              "How can I get started?",
              "Where can I find pricing information?",
            ],
      websiteUrl: websiteSource?.sourceUrl || null,
      sessionMessageLimit: chatbot.sessionMessageLimit ?? null,
      uiConfig: chatbot.uiConfig || {
        primaryColor: "#7c3aed",
        botAvatarUrl: null,
        launcherIcon: "chat",
        position: "bottom-right",
      },
    };
  },

  /**
   * Handles visitor chat from an embedded widget by publicId.
   * Enforces that the chatbot is ACTIVE (published).
   */
  async publicChat(
    publicId: string,
    input: ChatMessageInput,
  ): Promise<ChatResponseData> {
    const chatbot = await chatbotRepository.findByPublicId(publicId);
    if (!chatbot) {
      throw chatbotNotFound();
    }

    if (chatbot.status !== "ACTIVE") {
      return {
        answer:
          "This assistant is currently paused or undergoing maintenance. Please try again later.",
        sources: [],
        hasGroundedEvidence: false,
        stats: {
          retrieval_duration_ms: 0,
          generation_duration_ms: 0,
          total_duration_ms: 0,
          model_used: "offline-notice",
          chunks_retrieved: 0,
        },
      };
    }

    const sources = await knowledgeSourceRepository.findAllForChatbot(chatbot._id);
    const websiteSource =
      sources.find((s) => (s.type === "URL" || s.type === "WEBPAGE") && s.sourceUrl) ||
      sources.find((s) => s.sourceUrl) ||
      sources[0];

    // Ingestion check for Instant Bots
    if (chatbot.creationMode === "INSTANT") {
      if (websiteSource && websiteSource.status === "FAILED") {
        return {
          answer:
            "This assistant is currently updating its knowledge index. Please check back shortly.",
          sources: [],
          hasGroundedEvidence: false,
          stats: {
            retrieval_duration_ms: 0,
            generation_duration_ms: 0,
            total_duration_ms: 0,
            model_used: "indexing-notice",
            chunks_retrieved: 0,
          },
        };
      }
    }

    const question = (input.message || input.question || "").trim();
    const websiteUrl = websiteSource?.sourceUrl || undefined;

    try {
      const rawApiKey = chatbot.apiKey ? decryptSecret(chatbot.apiKey) : undefined;

      const qaResponse = await aiServiceClient.askQuestion({
        chatbotId: chatbot._id.toString(),
        question,
        botName: chatbot.name,
        websiteUrl,
        systemPrompt: chatbot.systemPrompt || undefined,
        topK: input.topK ?? chatbot.ragTopK ?? 8,
        llmProvider: chatbot.provider || "gemini",
        llmModel: chatbot.model || process.env.GEMINI_MODEL || "gemini-flash-latest",
        llmApiKey: rawApiKey || process.env.GEMINI_API_KEY,
        chatHistory: input.chatHistory || input.chat_history,
      });

      // Non-blocking asynchronous interaction logging for developer observability
      const maxScore =
        qaResponse.sources?.reduce(
          (max, s) => (typeof s.score === "number" && s.score > max ? s.score : max),
          0,
        ) ?? 0;
      const isLowConfidence =
        Boolean(qaResponse.sources && qaResponse.sources.length > 0 && maxScore < 0.65);
      const isUnverified = !qaResponse.has_grounded_evidence;
      const shouldFlag = isUnverified || isLowConfidence;
      const flagReason = isUnverified
        ? "NO_GROUNDED_EVIDENCE"
        : isLowConfidence
        ? `LOW_SIMILARITY (${(maxScore * 100).toFixed(1)}%)`
        : undefined;

      void DevChatLogModel.create({
        chatbotId: chatbot._id,
        chatbotName: chatbot.name,
        publicId,
        question,
        answer: qaResponse.answer,
        hasGroundedEvidence: qaResponse.has_grounded_evidence,
        sources: qaResponse.sources || [],
        stats: qaResponse.stats,
        isFlagged: shouldFlag,
        flagReason,
        isTestChat: false,
      }).catch((logErr) => {
        console.error("Failed to write dev chat log:", logErr);
      });

      return {
        answer: qaResponse.answer,
        sources: qaResponse.sources,
        hasGroundedEvidence: qaResponse.has_grounded_evidence,
        stats: qaResponse.stats,
      };
    } catch (err: unknown) {
      console.warn("Public chat communication error, returning soft fallback", {
        publicId,
        error: err instanceof Error ? err.message : String(err),
      });

      const fallbackAnswer =
        "We are currently experiencing a brief delay connecting to our service. Please try asking your question again in a moment, or feel free to explore our website directly.";

      void DevChatLogModel.create({
        chatbotId: chatbot._id,
        chatbotName: chatbot.name,
        publicId,
        question,
        answer: fallbackAnswer,
        hasGroundedEvidence: false,
        sources: [],
        isFlagged: true,
        flagReason: `INFERENCE_ERROR: ${err instanceof Error ? err.message : String(err)}`,
        isTestChat: false,
      }).catch(() => {});

      return {
        answer: fallbackAnswer,
        sources: [],
        hasGroundedEvidence: false,
        stats: {
          retrieval_duration_ms: 0,
          generation_duration_ms: 0,
          total_duration_ms: 0,
          model_used: "fallback-graceful",
          chunks_retrieved: 0,
        },
      };
    }
  },
};
