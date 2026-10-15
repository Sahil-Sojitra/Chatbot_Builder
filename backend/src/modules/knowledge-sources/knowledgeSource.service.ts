import crypto from "node:crypto";

import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

import { AppError, chatbotNotFound, organizationNotFound } from "../../shared/errors.js";
import { createPresignedUploadUrl, headObject } from "../../shared/storage.js";
import { chatbotRepository } from "../chatbots/chatbot.repository.js";
import { organizationRepository } from "../organizations/organization.repository.js";
import { aiServiceClient, AIServiceError } from "../../shared/aiServiceClient.js";
import { knowledgeSourceRepository } from "./knowledgeSource.repository.js";
import type { CreateKnowledgeSourceInput as RepositoryCreateKnowledgeSourceInput } from "./knowledgeSource.repository.js";
import { pendingUploadRepository } from "./pendingUpload.repository.js";
import { MAX_FILE_SIZE_BYTES } from "./knowledgeSource.validation.js";
import type {
  CompleteFileUploadBody,
  CreateKnowledgeSourceBody,
  InitiateFileUploadBody,
} from "./knowledgeSource.validation.js";
import type { IKnowledgeSource } from "./knowledgeSource.model.js";
import type { PublicKnowledgeSource } from "./knowledgeSource.types.js";

/** Presigned upload URLs — and the pending-upload record they're bound to — are short-lived: 15 minutes. */
const UPLOAD_URL_EXPIRES_IN_SECONDS = 900;

export interface InitiateFileUploadResult {
  uploadId: string;
  uploadUrl: string;
  expiresIn: number;
}

/**
 * Reduces a client-supplied filename to a safe path segment.
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
 * Backend-generated storage key — never accepted from the client.
 */
const generateObjectKey = (
  chatbotId: Types.ObjectId,
  originalName: string,
): string => {
  const uniqueId = crypto.randomUUID();
  const safeName = sanitizeFileName(originalName);
  return `knowledge-sources/${chatbotId.toString()}/${uniqueId}-${safeName}`;
};

type ClientFacingKnowledgeSource = Omit<
  PublicKnowledgeSource,
  "storageKey" | "error"
>;

const knowledgeSourceNotFound = (): AppError =>
  new AppError(404, "NOT_FOUND", "No knowledge source found");

const uploadNotFound = (): AppError =>
  new AppError(404, "NOT_FOUND", "No pending upload found");

const uploadVerificationFailed = (message: string): AppError =>
  new AppError(422, "VALIDATION_ERROR", message);

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
 * Resolves the authenticated user's organization, then the chatbot within it.
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
   * Synchronously creates and ingests a knowledge source under the given chatbot.
   * For URL / WEBPAGE (Instant Bot ingestion), calls the FastAPI AI service synchronously
   * and updates MongoDB status (PROCESSING -> READY or FAILED).
   */
  async createForOwner(
    ownerId: string,
    chatbotId: string,
    input: CreateKnowledgeSourceBody,
  ): Promise<ClientFacingKnowledgeSource> {
    const chatbot = await resolveOwnedChatbot(ownerId, chatbotId);

    // Instant Bot specific concurrency, URL validation, and retry deduplication checks
    if (chatbot.creationMode === "INSTANT" && (input.type === "URL" || input.type === "WEBPAGE")) {
      const existingSources = await knowledgeSourceRepository.findAllForChatbot(chatbot._id);

      // 1. Prevent concurrent ingestion or double-click duplicates
      const inProgressSource = existingSources.find(
        (s) => s.status === "PENDING" || s.status === "PROCESSING",
      );
      if (inProgressSource) {
        throw new AppError(
          409,
          "INVALID_STATE_TRANSITION",
          "Website ingestion is already in progress for this chatbot.",
        );
      }

      // 2. Prevent silently attaching a different website URL to an existing Instant Bot chatbot
      const existingWithUrl = existingSources.find((s) => s.sourceUrl);
      if (existingWithUrl && existingWithUrl.sourceUrl !== input.sourceUrl) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Cannot attach a different website URL to an existing Instant Bot chatbot. Please create a new chatbot.",
        );
      }

      // 3. If an existing source is already READY for this URL, return it
      const readySource = existingSources.find(
        (s) => s.status === "READY" && s.sourceUrl === input.sourceUrl,
      );
      if (readySource) {
        return toPublicKnowledgeSource(readySource);
      }

      // 4. Handle retry vs initial creation
      // existingSources are sorted newest first ({ createdAt: -1 }).
      const failedSources = existingSources.filter((s) => s.status === "FAILED");

      let sourceToProcess: HydratedDocument<IKnowledgeSource>;

      const firstFailedSource = failedSources[0];
      if (failedSources.length >= 2 && firstFailedSource) {
        // A second retry: We already have the initial failed record (preserved for diagnosis)
        // and a subsequent failed retry record. Reuse the latest retry record rather than
        // creating duplicate knowledge sources.
        const resetSource = await knowledgeSourceRepository.resetForRetry(
          firstFailedSource._id.toString(),
          input.name,
          input.sourceUrl,
        );
        sourceToProcess = resetSource ?? firstFailedSource;
      } else {
        // Initial setup (0 failed sources) OR First retry (1 failed source):
        // Create a new knowledge source record. If 1 failed source exists, it is preserved.
        const creationInput: RepositoryCreateKnowledgeSourceInput = {
          chatbotId: chatbot._id,
          type: input.type,
          name: input.name,
          sourceUrl: input.sourceUrl,
          createdBy: new Types.ObjectId(ownerId),
        };
        const created = await knowledgeSourceRepository.create(creationInput);
        const claimed = await knowledgeSourceRepository.claimForProcessing(created._id.toString());
        sourceToProcess = claimed ?? created;
      }

      try {
        const ingestionResult = await aiServiceClient.ingestWebsite({
          chatbotId: chatbot._id.toString(),
          websiteUrl: input.sourceUrl,
        });

        if (!ingestionResult.success) {
          const failureMsg = ingestionResult.error_message || "Website ingestion failed in AI service";
          await knowledgeSourceRepository.markFailed(sourceToProcess._id.toString(), failureMsg);
          throw new AppError(422, "INGESTION_FAILED", failureMsg);
        }

        const readySource = await knowledgeSourceRepository.markReady(sourceToProcess._id.toString());
        return {
          ...toPublicKnowledgeSource(readySource ?? sourceToProcess),
          pagesCrawled: ingestionResult.pages_crawled,
          chunksIndexed: ingestionResult.chunks_indexed,
          pagesDiscovered: ingestionResult.pages_discovered ?? ingestionResult.pages_crawled,
          pagesFailed: ingestionResult.pages_failed ?? 0,
        };
      } catch (err: unknown) {
        if (err instanceof AppError) {
          throw err;
        }
        const safeError = err instanceof AIServiceError ? err.message : "Website crawling and indexing failed";
        await knowledgeSourceRepository.markFailed(sourceToProcess._id.toString(), safeError);
        const statusCode = err instanceof AIServiceError ? err.status : 500;
        throw new AppError(statusCode, "INGESTION_FAILED", safeError);
      }
    }

    // Default flow for Custom Bots (or TEXT sources)
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

    // Synchronous Custom Bot ingestion via FastAPI
    if (input.type === "URL" || input.type === "WEBPAGE") {
      await knowledgeSourceRepository.claimForProcessing(source._id.toString());

      try {
        const ingestionResult = await aiServiceClient.ingestWebsite({
          chatbotId: chatbot._id.toString(),
          websiteUrl: input.sourceUrl,
        });

        if (!ingestionResult.success) {
          const failureMsg = ingestionResult.error_message || "Website ingestion failed in AI service";
          await knowledgeSourceRepository.markFailed(source._id.toString(), failureMsg);
          throw new AppError(422, "INGESTION_FAILED", failureMsg);
        }

        const readySource = await knowledgeSourceRepository.markReady(source._id.toString());
        return {
          ...toPublicKnowledgeSource(readySource ?? source),
          pagesCrawled: ingestionResult.pages_crawled,
          chunksIndexed: ingestionResult.chunks_indexed,
          pagesDiscovered: ingestionResult.pages_discovered ?? ingestionResult.pages_crawled,
          pagesFailed: ingestionResult.pages_failed ?? 0,
        };
      } catch (err: unknown) {
        if (err instanceof AppError) {
          throw err;
        }
        const safeError = err instanceof AIServiceError ? err.message : "Website crawling and indexing failed";
        await knowledgeSourceRepository.markFailed(source._id.toString(), safeError);
        const statusCode = err instanceof AIServiceError ? err.status : 500;
        throw new AppError(statusCode, "INGESTION_FAILED", safeError);
      }
    } else if (input.type === "TEXT") {
      // Mark text knowledge sources READY immediately
      await knowledgeSourceRepository.claimForProcessing(source._id.toString());
      const readySource = await knowledgeSourceRepository.markReady(source._id.toString(), input.sourceText);
      return toPublicKnowledgeSource(readySource ?? source);
    }

    return toPublicKnowledgeSource(source);
  },

  /**
   * Fetches one knowledge source by id, scoped to the given chatbot.
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
   * Lists every knowledge source under the given chatbot.
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
   * Initializes a FILE upload.
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

    const pendingUpload = await pendingUploadRepository.create({
      chatbotId: chatbot._id,
      createdBy: new Types.ObjectId(ownerId),
      originalName: input.originalName,
      mimeType: input.mimeType,
      storageKey: key,
      expiresAt: new Date(Date.now() + UPLOAD_URL_EXPIRES_IN_SECONDS * 1000),
    });

    return {
      uploadId: pendingUpload._id.toString(),
      uploadUrl,
      expiresIn: UPLOAD_URL_EXPIRES_IN_SECONDS,
    };
  },

  /**
   * Completes a previously initiated FILE upload.
   */
  async completeFileUpload(
    ownerId: string,
    chatbotId: string,
    input: CompleteFileUploadBody,
  ): Promise<ClientFacingKnowledgeSource> {
    const chatbot = await resolveOwnedChatbot(ownerId, chatbotId);

    const pendingUpload = await pendingUploadRepository.claimPendingByIdForChatbot(
      input.uploadId,
      chatbot._id,
    );
    if (!pendingUpload) {
      throw uploadNotFound();
    }

    const metadata = await headObject(pendingUpload.storageKey);
    if (!metadata) {
      throw uploadVerificationFailed(
        "Uploaded file was not found in storage",
      );
    }
    if (metadata.sizeBytes <= 0) {
      throw uploadVerificationFailed("Uploaded file is empty");
    }
    if (metadata.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw uploadVerificationFailed(
        `Uploaded file exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes`,
      );
    }
    if (metadata.contentType !== pendingUpload.mimeType) {
      throw uploadVerificationFailed(
        "Uploaded file's content type does not match the authorized type",
      );
    }

    const source = await knowledgeSourceRepository.create({
      chatbotId: chatbot._id,
      type: "FILE",
      name: pendingUpload.originalName,
      createdBy: new Types.ObjectId(ownerId),
      originalName: pendingUpload.originalName,
      mimeType: pendingUpload.mimeType,
      sizeBytes: metadata.sizeBytes,
      storageKey: pendingUpload.storageKey,
    });

    return toPublicKnowledgeSource(source);
  },
};
