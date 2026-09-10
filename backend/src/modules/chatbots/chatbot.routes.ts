import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { chatbotController } from "./chatbot.controller.js";
import {
  createChatbotSchema,
  updateChatbotSchema,
} from "./chatbot.validation.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  validateBody(createChatbotSchema),
  asyncHandler(chatbotController.create),
);

router.get("/", requireAuth, asyncHandler(chatbotController.list));

router.get("/:id", requireAuth, asyncHandler(chatbotController.get));

router.patch(
  "/:id",
  requireAuth,
  validateBody(updateChatbotSchema),
  asyncHandler(chatbotController.update),
);

export default router;
