import type { Request, Response } from "express";

import { unauthorized } from "../../shared/errors.js";
import { sendSuccess } from "../../shared/http.js";
import { chatbotService } from "./chatbot.service.js";
import type {
  CreateChatbotInput,
  UpdateChatbotInput,
} from "./chatbot.types.js";

export const chatbotController = {
  async create(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const chatbot = await chatbotService.createForOwner(
      req.auth.userId,
      req.body as CreateChatbotInput,
    );

    sendSuccess(res, { chatbot }, 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const chatbots = await chatbotService.listForOwner(req.auth.userId);

    sendSuccess(res, { chatbots }, 200);
  },

  async get(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const chatbot = await chatbotService.getForOwner(
      req.auth.userId,
      req.params.id as string,
    );

    sendSuccess(res, { chatbot }, 200);
  },

  async update(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const chatbot = await chatbotService.updateForOwner(
      req.auth.userId,
      req.params.id as string,
      req.body as UpdateChatbotInput,
    );

    sendSuccess(res, { chatbot }, 200);
  },

  async publish(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }

    const chatbot = await chatbotService.publishForOwner(
      req.auth.userId,
      req.params.id as string,
    );

    sendSuccess(res, { chatbot }, 200);
  },
};
