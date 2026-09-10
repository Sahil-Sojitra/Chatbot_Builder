import crypto from "node:crypto";

import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

import { chatbotNotFound, organizationNotFound } from "../../shared/errors.js";
import { generateUniqueSlug } from "../../shared/slug.js";
import { organizationRepository } from "../organizations/organization.repository.js";
import { chatbotRepository } from "./chatbot.repository.js";
import type {
  CreateChatbotInput as RepositoryCreateChatbotInput,
  UpdateChatbotFields,
} from "./chatbot.repository.js";
import type { IChatbot } from "./chatbot.model.js";
import type {
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
};
