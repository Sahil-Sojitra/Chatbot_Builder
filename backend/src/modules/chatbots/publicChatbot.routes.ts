import { Router } from "express";

import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { chatMessageSchema } from "./chatbot.validation.js";
import { publicChatbotController } from "./publicChatbot.controller.js";

const router = Router();

router.get(
  "/:publicId",
  asyncHandler(publicChatbotController.getConfig),
);

router.post(
  "/:publicId/chat",
  validateBody(chatMessageSchema),
  asyncHandler(publicChatbotController.chat),
);

export default router;
