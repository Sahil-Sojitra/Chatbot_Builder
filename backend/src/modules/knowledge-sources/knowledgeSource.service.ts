import crypto from "node:crypto";

import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

import { AppError, chatbotNotFound, organizationNotFound } from "../../shared/errors.js";
import { createPresignedUploadUrl } from "../../shared/r2.js";
import { chatbotRepository } from "../chatbots/chatbot.repository.js";
import { organizationRepository } from "../organizations/organization.repository.js";
import { knowledgeSourceRepository } from "./knowledgeSource.repository.js";
import type { CreateKnowledgeSourceInput as RepositoryCreateKnowledgeSourceInput } from "./knowledgeSource.repository.js";
import type {
  CreateKnowledgeSourceBody,
  InitiateFileUploadBody,
} from "./knowledgeSource.validation.js";
import type { IKnowledgeSource } from "./knowledgeSource.model.js";
import type { PublicKnowledgeSource } from "./knowledgeSource.types.js";

/** Presigned upload URLs are short-lived: 15 minutes. */
const UPLOAD_URL_EXPIRES_IN_SECONDS = 900;

export interface InitiateFileUploadResult {
  uploadUrl: string;
  expiresIn: number;
}

/**
 * Reduces a client-supplied filename to a safe path segment — lowercase,
 * ASCII alnum/dot/dash/underscore only, collapsed separators. Never trusted
 * as-is in the storage key: this only prevents path traversal and odd
 * characters, the uniqueness guarantee comes from the random id prefix.
 */
const sanitizeFileName = (name: string): string => {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 100);

  return safe.length > 0 ? safe : "file";
};

/**
 * Backend-generated storage key — never accepted from the client. Scoped
 * under the chatbot and prefixed with a random id so two uploads of the
 * same filename (or a maliciously chosen one) can never collide or land at
 * the bucket root.
 */
const generateObjectKey = (
  chatbotId: Types.ObjectId,
  originalName: string,
): string => {
  const uniqueId = crypto.randomUUID();
  const safeName = sanitizeFileName(originalName);
  return `knowledge-sources/${chatbotId.toString()}/${uniqueId}-${safeName}`;
};

/**
 * Dashboard-facing shape: storageKey and error are internal implementation
 * details (an object-storage key and a raw processing error message) that
 * are never returned to the client, even though they're stored on the
 * model. Narrowed locally rather than in knowledgeSource.types.ts so
 * PublicKnowledgeSource itself is untouched.
 */
type ClientFacingKnowledgeSource = Omit<
  PublicKnowledgeSource,
  "storageKey" | "error"
>;

/**
 * A knowledge source that doesn't exist, or exists under a different
 * chatbot, resolves to the same generic 404 — matching chatbotNotFound()'s
 * "NOT_FOUND" code and the project's convention of never surfacing a 403 for
 * cross-tenant access.
 */
const knowledgeSourceNotFound = (): AppError =>
  new AppError(404, "NOT_FOUND", "No knowledge source found");

const toPublicKnowledgeSource = (
  source: HydratedDocument<IKnowledgeSource>,
): ClientFacingKnowledgeSource => ({
  id: source._id.toString(),
  chatbotId: source.chatbotId.toString(),
  type: source.type,
  name: source.name,
  status: source.status,

  originalName: source.originalName,
  mimeType: source.mimeType,
  sizeBytes: source.sizeBytes,
  sourceUrl: source.sourceUrl,
  sourceText: source.sourceText,

  title: source.title,
  author: source.author,
  language: source.language,
  contentType: source.contentType,

  lastProcessedAt: source.lastProcessedAt ? source.lastProcessedAt.toISOString() : null,

  createdBy: source.createdBy.toString(),
  createdAt: source.createdAt.toISOString(),
  updatedAt: source.updatedAt.toISOString(),
});

/**
 * Resolves the authenticated user's organization, then the chatbot within
 * it. Every service method starts here — a client can never supply
 * organizationId, and a chatbotId alone is never sufficient to prove
 * ownership. Throws organizationNotFound()/chatbotNotFound() exactly like
 * chatbotService does.
 */
const resolveOwnedChatbot = async (ownerId: string, chatbotId: string) => {
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

  return chatbot;
};

export const knowledgeSourceService = {
  /**
   * Creates a knowledge source under the given chatbot, scoped to the
   * authenticated user's organization. Only TEXT/URL/WEBPAGE are supported
   * here — FILE creation (and storageKey generation) is not implemented
   * yet. status is never accepted from the client; it's left to the model's
   * PENDING default.
   */
  async createForOwner(
    ownerId: string,
    chatbotId: string,
    input: CreateKnowledgeSourceBody,
  ): Promise<ClientFacingKnowledgeSource> {
    const chatbot = await resolveOwnedChatbot(ownerId, chatbotId);

    const creationInput: RepositoryCreateKnowledgeSourceInput = {
      chatbotId: chatbot._id,
      type: input.type,
      name: input.name,
      createdBy: new Types.ObjectId(ownerId),
    };
    if (input.type === "URL" || input.type === "WEBPAGE") {
      creationInput.sourceUrl = input.sourceUrl;
    }
    if (input.type === "TEXT") {
      creationInput.sourceText = input.sourceText;
    }

    const source = await knowledgeSourceRepository.create(creationInput);

    return toPublicKnowledgeSource(source);
  },

  /**
   * Fetches one knowledge source by id, scoped to the given chatbot and the
   * authenticated user's organization. A knowledge source belonging to a
   * different chatbot resolves to the same 404 as one that doesn't exist.
   */
  async getForOwner(
    ownerId: string,
    chatbotId: string,
    sourceId: string,
  ): Promise<ClientFacingKnowledgeSource> {
    const chatbot = await resolveOwnedChatbot(ownerId, chatbotId);

    const source = await knowledgeSourceRepository.findByIdForChatbot(
      sourceId,
      chatbot._id,
    );
    if (!source) {
      throw knowledgeSourceNotFound();
    }

    return toPublicKnowledgeSource(source);
  },

  /**
   * Lists every knowledge source under the given chatbot, scoped to the
   * authenticated user's organization. Ordered newest first, as returned by
   * the repository.
   */
  async listForOwner(
    ownerId: string,
    chatbotId: string,
  ): Promise<ClientFacingKnowledgeSource[]> {
    const chatbot = await resolveOwnedChatbot(ownerId, chatbotId);

    const sources = await knowledgeSourceRepository.findAllForChatbot(
      chatbot._id,
    );

    return sources.map(toPublicKnowledgeSource);
  },

  /**
   * Initializes a FILE upload: verifies chatbot ownership, generates a
   * backend-controlled storage key, and returns a presigned R2 PUT URL
   * bound to the validated mimeType. Does NOT create a KnowledgeSource
   * document — that happens only once the client has actually uploaded the
   * object, via a separate endpoint not implemented yet. sizeBytes is
   * validated here but not persisted anywhere yet since there is no
   * document to store it on.
   */
  async initiateFileUpload(
    ownerId: string,
    chatbotId: string,
    input: InitiateFileUploadBody,
  ): Promise<InitiateFileUploadResult> {
    const chatbot = await resolveOwnedChatbot(ownerId, chatbotId);

    const key = generateObjectKey(chatbot._id, input.originalName);

    const uploadUrl = await createPresignedUploadUrl(
      key,
      input.mimeType,
      UPLOAD_URL_EXPIRES_IN_SECONDS,
    );

    return { uploadUrl, expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS };
  },
};
