import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { knowledgeSourceController } from "./knowledgeSource.controller.js";
import { createKnowledgeSourceSchema } from "./knowledgeSource.validation.js";

const router = Router();

router.post(
  "/:chatbotId",
  requireAuth,
  validateBody(createKnowledgeSourceSchema),
  asyncHandler(knowledgeSourceController.create),
);

router.get(
  "/:chatbotId",
  requireAuth,
  asyncHandler(knowledgeSourceController.list),
);

router.get(
  "/:chatbotId/:sourceId",
  requireAuth,
  asyncHandler(knowledgeSourceController.get),
);

export default router;
