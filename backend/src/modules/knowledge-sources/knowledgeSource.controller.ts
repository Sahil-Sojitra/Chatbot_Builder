import type { Request, Response } from "express";

import { unauthorized } from "../../shared/errors.js";
import { sendSuccess } from "../../shared/http.js";
import { knowledgeSourceService } from "./knowledgeSource.service.js";
import type {
  CompleteFileUploadBody,
  CreateKnowledgeSourceBody,
  InitiateFileUploadBody,
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

    const knowledgeSources = await knowledgeSourceService.listForOwner(
      req.auth.userId,
      req.params.chatbotId as string,
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
};
