import type { Request, Response } from "express";

import { sendSuccess } from "../../shared/http.js";
import { chatbotService } from "./chatbot.service.js";
import type { ChatMessageInput } from "./chatbot.types.js";

export const publicChatbotController = {
  async getConfig(req: Request, res: Response): Promise<void> {
    const config = await chatbotService.getPublicConfig(
      req.params.publicId as string,
    );
    sendSuccess(res, config, 200);
  },

  async chat(req: Request, res: Response): Promise<void> {
    const result = await chatbotService.publicChat(
      req.params.publicId as string,
      req.body as ChatMessageInput,
    );
    sendSuccess(res, result, 200);
  },
};
