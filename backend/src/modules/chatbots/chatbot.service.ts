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
import { generateUniqueSlug } from "../../shared/slug.js";
import { organizationRepository } from "../organizations/organization.repository.js";
import { knowledgeSourceRepository } from "../knowledge-sources/knowledgeSource.repository.js";
import { chatbotRepository } from "./chatbot.repository.js";
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
): PublicChatbot => ({
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
  temperature: chatbot.temperature,
  maxTokens: chatbot.maxTokens,
  ragEnabled: chatbot.ragEnabled,
  ragTopK: chatbot.ragTopK,
  ragSimilarityThreshold: chatbot.ragSimilarityThreshold,
  uiConfig: chatbot.uiConfig,
  createdBy: chatbot.createdBy.toString(),
  publishedBy: chatbot.publishedBy ? chatbot.publishedBy.toString() : null,
  publishedAt: chatbot.publishedAt ? chatbot.publishedAt.toISOString() : null,
  createdAt: chatbot.createdAt.toISOString(),
  updatedAt: chatbot.updatedAt.toISOString(),
});

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
    if (input.temperature !== undefined) {
      creationInput.temperature = input.temperature;
    }
    if (input.maxTokens !== undefined) {
      creationInput.maxTokens = input.maxTokens;
    }
    if (input.ragTopK !== undefined) {
      creationInput.ragTopK = input.ragTopK;
    }
    if (input.ragSimilarityThreshold !== undefined) {
      creationInput.ragSimilarityThreshold = input.ragSimilarityThreshold;
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
    if (input.temperature !== undefined) {
      fields.temperature = input.temperature;
    }
    if (input.maxTokens !== undefined) {
      fields.maxTokens = input.maxTokens;
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

    // Ingestion readiness gate for Instant Bots
    if (chatbot.creationMode === "INSTANT") {
      const sources = await knowledgeSourceRepository.findAllForChatbot(chatbot._id);
      const websiteSource =
        sources.find((s) => s.type === "URL" || s.type === "WEBPAGE") || sources[0];

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

    try {
      const qaResponse = await aiServiceClient.askQuestion({
        chatbotId: chatbot._id.toString(),
        question,
        topK: input.topK ?? chatbot.ragTopK ?? 4,
      });

      return {
        answer: qaResponse.answer,
        sources: qaResponse.sources,
        hasGroundedEvidence: qaResponse.has_grounded_evidence,
        stats: qaResponse.stats,
      };
    } catch (err: unknown) {
      if (err instanceof AIServiceError) {
        const statusCode = err.status >= 400 && err.status < 600 ? err.status : 502;
        throw new AppError(statusCode, "AI_SERVICE_ERROR", err.message);
      }
      if (err instanceof AppError) {
        throw err;
      }
      const message =
        err instanceof Error ? err.message : "Failed to communicate with AI chat service";
      throw new AppError(502, "AI_SERVICE_ERROR", message);
    }
  },
};
