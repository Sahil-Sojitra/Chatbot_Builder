import type { Request, Response } from "express";

import { AppError, unauthorized } from "../../shared/errors.js";
import { sendSuccess } from "../../shared/http.js";
import { knowledgeSourceService } from "./knowledgeSource.service.js";
import type {
  CompleteFileUploadBody,
  CreateKnowledgeSourceBody,
  InitiateFileUploadBody,
  UpdateKnowledgeSourceBody,
} from "./knowledgeSource.validation.js";

export const knowledgeSourceController = {
  async create(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const knowledgeSource = await knowledgeSourceService.createForOwner(
      req.auth.userId,
      req.params.chatbotId as string,
      req.body as CreateKnowledgeSourceBody,
    );

    sendSuccess(res, { knowledgeSource }, 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const rawChatbotId =
      (req.params.chatbotId as string | undefined) ||
      (req.query.chatbotId as string | undefined);
    const chatbotId = rawChatbotId?.trim();

    if (!chatbotId) {
      sendSuccess(res, { knowledgeSources: [] }, 200);
      return;
    }

    const knowledgeSources = await knowledgeSourceService.listForOwner(
      req.auth.userId,
      chatbotId,
    );

    sendSuccess(res, { knowledgeSources }, 200);
  },

  async get(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const knowledgeSource = await knowledgeSourceService.getForOwner(
      req.auth.userId,
      req.params.chatbotId as string,
      req.params.sourceId as string,
    );

    sendSuccess(res, { knowledgeSource }, 200);
  },

  async initiateUpload(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const result = await knowledgeSourceService.initiateFileUpload(
      req.auth.userId,
      req.params.chatbotId as string,
      req.body as InitiateFileUploadBody,
    );

    sendSuccess(res, result, 200);
  },

  async completeUpload(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const knowledgeSource = await knowledgeSourceService.completeFileUpload(
      req.auth.userId,
      req.params.chatbotId as string,
      req.body as CompleteFileUploadBody,
    );

    sendSuccess(res, { knowledgeSource }, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const knowledgeSource = await knowledgeSourceService.updateForOwner(
      req.auth.userId,
      req.params.chatbotId as string,
      req.params.sourceId as string,
      req.body as UpdateKnowledgeSourceBody,
    );

    sendSuccess(res, { knowledgeSource }, 200);
  },

  async delete(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    await knowledgeSourceService.deleteForOwner(
      req.auth.userId,
      req.params.chatbotId as string,
      req.params.sourceId as string,
    );

    sendSuccess(res, { deleted: true }, 200);
  },

  async retry(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const knowledgeSource = await knowledgeSourceService.retryForOwner(
      req.auth.userId,
      req.params.chatbotId as string,
      req.params.sourceId as string,
    );

    sendSuccess(res, { knowledgeSource }, 200);
  },

  async uploadDirect(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const files: Express.Multer.File[] = [];
    if (req.files && Array.isArray(req.files)) {
      files.push(...(req.files as Express.Multer.File[]));
    } else if (req.files && typeof req.files === "object") {
      for (const fieldFiles of Object.values(req.files)) {
        if (Array.isArray(fieldFiles)) {
          files.push(...fieldFiles);
        }
      }
    } else if (req.file) {
      files.push(req.file);
    }

    if (files.length === 0) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "No file uploaded. Please attach a file using multipart/form-data with field name 'file' or 'files'.",
      );
    }

    const knowledgeSources = await knowledgeSourceService.uploadDirectForOwner(
      req.auth.userId,
      req.params.chatbotId as string,
      files,
    );

    if (knowledgeSources.length === 1) {
      sendSuccess(res, { knowledgeSource: knowledgeSources[0], knowledgeSources }, 201);
    } else {
      sendSuccess(res, { knowledgeSources }, 201);
    }
  },
};
