import crypto from "node:crypto";

import { Types } from "mongoose";
import type { HydratedDocument } from "mongoose";

import { AppError, chatbotNotFound, organizationNotFound } from "../../shared/errors.js";
import {
  createPresignedUploadUrl,
  deleteObject,
  downloadObject,
  headObject,
  uploadObject,
} from "../../shared/storage.js";
import { decryptSecret } from "../../shared/encryption.js";
import { chatbotRepository } from "../chatbots/chatbot.repository.js";
import { organizationRepository } from "../organizations/organization.repository.js";
import { aiServiceClient, AIServiceError } from "../../shared/aiServiceClient.js";
import { knowledgeSourceRepository } from "./knowledgeSource.repository.js";
import type { CreateKnowledgeSourceInput as RepositoryCreateKnowledgeSourceInput } from "./knowledgeSource.repository.js";
import { pendingUploadRepository } from "./pendingUpload.repository.js";
import {
  MAX_FILE_SIZE_BYTES,
  resolveMimeTypeFromFilename,
  SUPPORTED_FILE_MIME_TYPES,
} from "./knowledgeSource.validation.js";
import type {
  CompleteFileUploadBody,
  CreateKnowledgeSourceBody,
  InitiateFileUploadBody,
  UpdateKnowledgeSourceBody,
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

      // 1. If an ingestion is currently in progress, return it so the caller can poll its progress
      const inProgressSource = existingSources.find(
        (s) => s.status === "PENDING" || s.status === "PROCESSING",
      );
      if (inProgressSource) {
        return toPublicKnowledgeSource(inProgressSource);
      }

      const normalizeUrl = (u: string) => {
        try {
          const parsed = new URL(u.trim());
          const cleanPath = parsed.pathname.replace(/\/+$/, "");
          return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${cleanPath}${parsed.search}`;
        } catch {
          return u.trim().replace(/\/+$/, "").toLowerCase();
        }
      };

      // 2. Prevent silently attaching a different website domain to an existing Instant Bot chatbot
      const existingWithUrl = existingSources.find((s) => s.sourceUrl);
      if (
        existingWithUrl &&
        existingWithUrl.sourceUrl &&
        normalizeUrl(existingWithUrl.sourceUrl) !== normalizeUrl(input.sourceUrl)
      ) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Cannot attach a different website URL to an existing Instant Bot chatbot. Please create a new chatbot.",
        );
      }

      // 3. Handle re-sync vs initial creation:
      // If an existing source already exists for this chatbot (READY or FAILED), reset it to PROCESSING
      // to re-crawl and re-index the latest website content!
      let sourceToProcess: HydratedDocument<IKnowledgeSource>;

      const existingSource = existingSources.find((s) => s.sourceUrl);
      if (existingSource) {
        const resetSource = await knowledgeSourceRepository.resetForProcessing(
          existingSource._id.toString(),
          input.name,
          input.sourceUrl,
        );
        sourceToProcess = resetSource ?? existingSource;
      } else {
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

      const processSourceId = sourceToProcess._id.toString();
      const botIdStr = chatbot._id.toString();
      const targetUrl = input.sourceUrl;

      // Asynchronous ingestion pipeline: Execute crawling, embedding, and vector indexing
      // in the background without blocking the HTTP request thread.
      void (async () => {
        try {
          const ingestionResult = await aiServiceClient.ingestWebsite({
            chatbotId: botIdStr,
            websiteUrl: targetUrl,
            maxPages: 25,
          });

          if (!ingestionResult.success) {
            const failureMsg = ingestionResult.error_message || "Website ingestion failed in AI service";
            await knowledgeSourceRepository.markFailed(processSourceId, failureMsg);
            return;
          }

          await knowledgeSourceRepository.markReady(processSourceId);

          if (ingestionResult.persona) {
            try {
              const updates: Record<string, unknown> = {};
              if (
                ingestionResult.persona.suggested_system_prompt &&
                (!chatbot.systemPrompt || chatbot.creationMode === "INSTANT")
              ) {
                updates.systemPrompt = ingestionResult.persona.suggested_system_prompt;
              }
              if (ingestionResult.persona.starter_questions?.length) {
                updates.starterQuestions = ingestionResult.persona.starter_questions;
              }
              if (ingestionResult.persona.brand_name && chatbot.creationMode === "INSTANT") {
                let cleanBrand = ingestionResult.persona.brand_name.trim();
                if (/^[0-9a-fA-F]{24}$/i.test(cleanBrand) && targetUrl) {
                  try {
                    const parsed = new URL(targetUrl);
                    const host = parsed.hostname.replace(/^www\./i, "");
                    const parts = host.split(".");
                    const firstPart = parts[0] || host;
                    if (firstPart) {
                      cleanBrand = firstPart.charAt(0).toUpperCase() + firstPart.slice(1);
                    }
                  } catch {}
                }
                updates.name = `${cleanBrand} Assistant`;
              }
              if (
                (ingestionResult.persona.company_description || ingestionResult.persona.tagline) &&
                chatbot.creationMode === "INSTANT"
              ) {
                updates.description =
                  ingestionResult.persona.company_description || ingestionResult.persona.tagline;
              }
              if (Object.keys(updates).length > 0) {
                await chatbotRepository.updateByIdForOrganization(
                  chatbot._id.toString(),
                  chatbot.organizationId,
                  updates,
                );
              }
            } catch (personaErr) {
              console.warn("[KnowledgeSourceService] Failed to auto-update bot persona:", personaErr);
            }
          }
        } catch (err: unknown) {
          const safeError = err instanceof AIServiceError ? err.message : "Website crawling and indexing failed";
          await knowledgeSourceRepository.markFailed(processSourceId, safeError);
        }
      })();

      return toPublicKnowledgeSource(sourceToProcess);
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

    // Asynchronous Custom Bot URL ingestion via FastAPI
    if (input.type === "URL" || input.type === "WEBPAGE") {
      const claimedSource = await knowledgeSourceRepository.claimForProcessing(source._id.toString());
      const activeSource = claimedSource ?? source;
      const processSourceId = activeSource._id.toString();
      const botIdStr = chatbot._id.toString();
      const targetUrl = input.sourceUrl;

      void (async () => {
        try {
          const ingestionResult = await aiServiceClient.ingestWebsite({
            chatbotId: botIdStr,
            websiteUrl: targetUrl,
            maxPages: 25,
          });

          if (!ingestionResult.success) {
            const failureMsg = ingestionResult.error_message || "Website ingestion failed in AI service";
            await knowledgeSourceRepository.markFailed(processSourceId, failureMsg);
            return;
          }

          await knowledgeSourceRepository.markReady(processSourceId);

          if (ingestionResult.persona?.starter_questions?.length && (!chatbot.starterQuestions || chatbot.starterQuestions.length === 0)) {
            try {
              await chatbotRepository.updateByIdForOrganization(
                chatbot._id.toString(),
                chatbot.organizationId,
                { starterQuestions: ingestionResult.persona.starter_questions },
              );
            } catch (personaErr) {
              console.warn("[KnowledgeSourceService] Failed to auto-update bot starter questions:", personaErr);
            }
          }
        } catch (err: unknown) {
          const safeError = err instanceof AIServiceError ? err.message : "Website crawling and indexing failed";
          await knowledgeSourceRepository.markFailed(processSourceId, safeError);
        }
      })();

      return toPublicKnowledgeSource(activeSource);
    } else if (input.type === "TEXT") {
      const claimedSource = await knowledgeSourceRepository.claimForProcessing(source._id.toString());
      const activeSource = claimedSource ?? source;
      const processSourceId = activeSource._id.toString();
      const botIdStr = chatbot._id.toString();
      const textContent = input.sourceText;
      const sourceName = input.name;

      // Asynchronously embed and index text into Pinecone under chatbot namespace
      void (async () => {
        try {
          const rawApiKey = chatbot.apiKey ? decryptSecret(chatbot.apiKey) : undefined;
          const base64Content = Buffer.from(textContent, "utf-8").toString("base64");

          const result = await aiServiceClient.ingestDocument({
            chatbotId: botIdStr,
            filename: `${sanitizeFileName(sourceName)}.txt`,
            contentBase64: base64Content,
            mimeType: "text/plain",
            sourceName,
            llmApiKey: rawApiKey,
            llmModel: typeof chatbot.model === "string" ? chatbot.model : undefined,
          });

          if (!result.success) {
            const failMsg = result.error_message || "Text indexing failed in AI service";
            await knowledgeSourceRepository.markFailed(processSourceId, failMsg);
            return;
          }

          await knowledgeSourceRepository.markReady(processSourceId, textContent);
        } catch (err: unknown) {
          const safeError =
            err instanceof AIServiceError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Text indexing failed in AI service";
          await knowledgeSourceRepository.markFailed(processSourceId, safeError);
        }
      })();

      return toPublicKnowledgeSource(activeSource);
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

    const claimedSource = await knowledgeSourceRepository.claimForProcessing(source._id.toString());
    const activeSource = claimedSource ?? source;
    const processSourceId = activeSource._id.toString();
    const botIdStr = chatbot._id.toString();
    const storageKey = pendingUpload.storageKey;
    const filename = pendingUpload.originalName;
    const mimeType = pendingUpload.mimeType;
    const sourceName = activeSource.name;

    // Asynchronously download file from object storage and ingest into AI service
    void (async () => {
      try {
        const fileBuffer = await downloadObject(storageKey);
        const base64Content = fileBuffer.toString("base64");
        const rawApiKey = chatbot.apiKey ? decryptSecret(chatbot.apiKey) : undefined;

        const result = await aiServiceClient.ingestDocument({
          chatbotId: botIdStr,
          filename,
          contentBase64: base64Content,
          mimeType,
          sourceName,
          llmApiKey: rawApiKey,
          llmModel: typeof chatbot.model === "string" ? chatbot.model : undefined,
        });

        if (!result.success) {
          const failMsg = result.error_message || "Document ingestion failed in AI service";
          await knowledgeSourceRepository.markFailed(processSourceId, failMsg);
          return;
        }

        await knowledgeSourceRepository.markReady(processSourceId);
      } catch (err: unknown) {
        const safeError =
          err instanceof AIServiceError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Document indexing failed in AI service";
        await knowledgeSourceRepository.markFailed(processSourceId, safeError);
      }
    })();

    return toPublicKnowledgeSource(activeSource);
  },

  /**
   * Directly uploads one or multiple files, stores them to object storage,
   * creates knowledge source records, and triggers vector ingestion in the AI service.
   */
  async uploadDirectForOwner(
    ownerId: string,
    chatbotId: string,
    files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>,
  ): Promise<ClientFacingKnowledgeSource[]> {
    const chatbot = await resolveOwnedChatbot(ownerId, chatbotId);

    if (!files || files.length === 0) {
      throw new AppError(400, "VALIDATION_ERROR", "No files provided for upload");
    }

    const createdSources: ClientFacingKnowledgeSource[] = [];

    for (const file of files) {
      // 1. Resolve and validate MIME type
      const resolvedMime =
        (SUPPORTED_FILE_MIME_TYPES as readonly string[]).includes(file.mimetype)
          ? file.mimetype
          : resolveMimeTypeFromFilename(file.originalname);

      if (!resolvedMime) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          `Unsupported file format for '${file.originalname}'. Supported formats: PDF, Word (.docx), PowerPoint (.pptx), Spreadsheets (.csv), Plain Text (.txt, .md), and Images (PNG, JPG, WEBP).`,
        );
      }

      if (file.size <= 0) {
        throw new AppError(400, "VALIDATION_ERROR", `Uploaded file '${file.originalname}' is empty`);
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          `File '${file.originalname}' exceeds the maximum allowed size of ${MAX_FILE_SIZE_BYTES} bytes (25 MB)`,
        );
      }

      // 2. Generate unique storage key and upload directly to object storage
      const storageKey = generateObjectKey(chatbot._id, file.originalname);
      try {
        await uploadObject(storageKey, file.buffer, resolvedMime);
      } catch (uploadErr) {
        console.warn(`[KnowledgeSourceService] Failed to upload ${file.originalname} to storage:`, uploadErr);
      }

      // 3. Create KnowledgeSource record in MongoDB
      const source = await knowledgeSourceRepository.create({
        chatbotId: chatbot._id,
        type: "FILE",
        name: file.originalname,
        createdBy: new Types.ObjectId(ownerId),
        originalName: file.originalname,
        mimeType: resolvedMime,
        sizeBytes: file.size,
        storageKey,
      });

      // 4. Claim for processing
      const claimedSource = await knowledgeSourceRepository.claimForProcessing(source._id.toString());
      const activeSource = claimedSource ?? source;
      const processSourceId = activeSource._id.toString();
      const botIdStr = chatbot._id.toString();
      const filename = file.originalname;
      const base64Content = file.buffer.toString("base64");
      const sourceName = activeSource.name;

      // 5. Trigger asynchronous document parsing, chunking, embedding, and vector upsert
      void (async () => {
        try {
          const rawApiKey = chatbot.apiKey ? decryptSecret(chatbot.apiKey) : undefined;
          const result = await aiServiceClient.ingestDocument({
            chatbotId: botIdStr,
            filename,
            contentBase64: base64Content,
            mimeType: resolvedMime,
            sourceName,
            llmApiKey: rawApiKey,
            llmModel: typeof chatbot.model === "string" ? chatbot.model : undefined,
          });

          if (!result.success) {
            const failMsg = result.error_message || "Document ingestion failed in AI service";
            await knowledgeSourceRepository.markFailed(processSourceId, failMsg);
            return;
          }

          await knowledgeSourceRepository.markReady(processSourceId);
        } catch (err: unknown) {
          const safeError =
            err instanceof AIServiceError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Document indexing failed in AI service";
          await knowledgeSourceRepository.markFailed(processSourceId, safeError);
        }
      })();

      createdSources.push(toPublicKnowledgeSource(activeSource));
    }

    return createdSources;
  },

  /**
   * Applies a partial update to a knowledge source (e.g. name or text content).
   */
  async updateForOwner(
    ownerId: string,
    chatbotId: string,
    sourceId: string,
    input: UpdateKnowledgeSourceBody,
  ): Promise<ClientFacingKnowledgeSource> {
    const chatbot = await resolveOwnedChatbot(ownerId, chatbotId);

    const existing = await knowledgeSourceRepository.findByIdForChatbot(
      sourceId,
      chatbot._id,
    );
    if (!existing) {
      throw knowledgeSourceNotFound();
    }

    const updated = await knowledgeSourceRepository.updateByIdForChatbot(
      sourceId,
      chatbot._id,
      input,
    );
    if (!updated) {
      throw knowledgeSourceNotFound();
    }

    // Re-index updated text source in AI service vector store
    if (input.sourceText !== undefined && updated.type === "TEXT") {
      const processSourceId = updated._id.toString();
      const botIdStr = chatbot._id.toString();
      const textContent = input.sourceText;
      const sourceName = updated.name;

      await knowledgeSourceRepository.resetForProcessing(processSourceId);

      void (async () => {
        try {
          const rawApiKey = chatbot.apiKey ? decryptSecret(chatbot.apiKey) : undefined;
          const base64Content = Buffer.from(textContent, "utf-8").toString("base64");

          const result = await aiServiceClient.ingestDocument({
            chatbotId: botIdStr,
            filename: `${sanitizeFileName(sourceName)}.txt`,
            contentBase64: base64Content,
            mimeType: "text/plain",
            sourceName,
            llmApiKey: rawApiKey,
            llmModel: typeof chatbot.model === "string" ? chatbot.model : undefined,
          });

          if (!result.success) {
            const failMsg = result.error_message || "Text indexing failed in AI service";
            await knowledgeSourceRepository.markFailed(processSourceId, failMsg);
            return;
          }

          await knowledgeSourceRepository.markReady(processSourceId, textContent);
        } catch (err: unknown) {
          const safeError =
            err instanceof AIServiceError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Text indexing failed in AI service";
          await knowledgeSourceRepository.markFailed(processSourceId, safeError);
        }
      })();
    }

    return toPublicKnowledgeSource(updated);
  },

  /**
   * Retries ingestion for a failed knowledge source.
   */
  async retryForOwner(
    ownerId: string,
    chatbotId: string,
    sourceId: string,
  ): Promise<ClientFacingKnowledgeSource> {
    const chatbot = await resolveOwnedChatbot(ownerId, chatbotId);

    const existing = await knowledgeSourceRepository.findByIdForChatbot(
      sourceId,
      chatbot._id,
    );
    if (!existing) {
      throw knowledgeSourceNotFound();
    }

    const resetSource = await knowledgeSourceRepository.resetForRetry(sourceId);
    if (!resetSource) {
      return toPublicKnowledgeSource(existing);
    }

    const processSourceId = resetSource._id.toString();
    const botIdStr = chatbot._id.toString();

    if (resetSource.type === "URL" || resetSource.type === "WEBPAGE") {
      const targetUrl = resetSource.sourceUrl;
      if (!targetUrl) {
        await knowledgeSourceRepository.markFailed(processSourceId, "Missing source URL");
        return toPublicKnowledgeSource(resetSource);
      }
      void (async () => {
        try {
          const ingestionResult = await aiServiceClient.ingestWebsite({
            chatbotId: botIdStr,
            websiteUrl: targetUrl,
            maxPages: 25,
          });

          if (!ingestionResult.success) {
            const failureMsg = ingestionResult.error_message || "Website ingestion failed in AI service";
            await knowledgeSourceRepository.markFailed(processSourceId, failureMsg);
            return;
          }

          await knowledgeSourceRepository.markReady(processSourceId);
        } catch (err: unknown) {
          const safeError = err instanceof AIServiceError ? err.message : "Website crawling and indexing failed";
          await knowledgeSourceRepository.markFailed(processSourceId, safeError);
        }
      })();
    } else if (resetSource.type === "FILE") {
      const storageKey = resetSource.storageKey;
      if (!storageKey) {
        await knowledgeSourceRepository.markFailed(processSourceId, "Missing storage key for file");
        return toPublicKnowledgeSource(resetSource);
      }
      void (async () => {
        try {
          const fileBuffer = await downloadObject(storageKey);
          const base64Content = fileBuffer.toString("base64");
          const rawApiKey = chatbot.apiKey ? decryptSecret(chatbot.apiKey) : undefined;

          const result = await aiServiceClient.ingestDocument({
            chatbotId: botIdStr,
            filename: resetSource.originalName || resetSource.name,
            contentBase64: base64Content,
            mimeType: resetSource.mimeType || undefined,
            sourceName: resetSource.name,
            llmApiKey: rawApiKey,
            llmModel: typeof chatbot.model === "string" ? chatbot.model : undefined,
          });

          if (!result.success) {
            const failMsg = result.error_message || "Document ingestion failed in AI service";
            await knowledgeSourceRepository.markFailed(processSourceId, failMsg);
            return;
          }

          await knowledgeSourceRepository.markReady(processSourceId);
        } catch (err: unknown) {
          const safeError =
            err instanceof AIServiceError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Document indexing failed in AI service";
          await knowledgeSourceRepository.markFailed(processSourceId, safeError);
        }
      })();
    } else if (resetSource.type === "TEXT") {
      const textContent = resetSource.sourceText || "";
      void (async () => {
        try {
          const rawApiKey = chatbot.apiKey ? decryptSecret(chatbot.apiKey) : undefined;
          const base64Content = Buffer.from(textContent, "utf-8").toString("base64");

          const result = await aiServiceClient.ingestDocument({
            chatbotId: botIdStr,
            filename: `${sanitizeFileName(resetSource.name)}.txt`,
            contentBase64: base64Content,
            mimeType: "text/plain",
            sourceName: resetSource.name,
            llmApiKey: rawApiKey,
            llmModel: typeof chatbot.model === "string" ? chatbot.model : undefined,
          });

          if (!result.success) {
            const failMsg = result.error_message || "Text indexing failed in AI service";
            await knowledgeSourceRepository.markFailed(processSourceId, failMsg);
            return;
          }

          await knowledgeSourceRepository.markReady(processSourceId, textContent);
        } catch (err: unknown) {
          const safeError =
            err instanceof AIServiceError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Text indexing failed in AI service";
          await knowledgeSourceRepository.markFailed(processSourceId, safeError);
        }
      })();
    }

    return toPublicKnowledgeSource(resetSource);
  },

  /**
   * Permanently deletes one knowledge source and its S3 file (if any).
   */
  async deleteForOwner(
    ownerId: string,
    chatbotId: string,
    sourceId: string,
  ): Promise<void> {
    const chatbot = await resolveOwnedChatbot(ownerId, chatbotId);

    const existing = await knowledgeSourceRepository.findByIdForChatbot(
      sourceId,
      chatbot._id,
    );
    if (!existing) {
      throw knowledgeSourceNotFound();
    }

    if (existing.storageKey) {
      await deleteObject(existing.storageKey);
    }

    await knowledgeSourceRepository.deleteByIdForChatbot(sourceId, chatbot._id);
  },
};
