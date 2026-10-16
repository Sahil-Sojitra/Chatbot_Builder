import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { knowledgeSourceController } from "./knowledgeSource.controller.js";
import {
  completeFileUploadSchema,
  createKnowledgeSourceSchema,
  initiateFileUploadSchema,
  updateKnowledgeSourceSchema,
} from "./knowledgeSource.validation.js";

const router = Router();

router.post(
  "/:chatbotId",
  requireAuth,
  validateBody(createKnowledgeSourceSchema),
  asyncHandler(knowledgeSourceController.create),
);

router.post(
  "/:chatbotId/upload",
  requireAuth,
  validateBody(initiateFileUploadSchema),
  asyncHandler(knowledgeSourceController.initiateUpload),
);

router.post(
  "/:chatbotId/upload/complete",
  requireAuth,
  validateBody(completeFileUploadSchema),
  asyncHandler(knowledgeSourceController.completeUpload),
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

router.patch(
  "/:chatbotId/:sourceId",
  requireAuth,
  validateBody(updateKnowledgeSourceSchema),
  asyncHandler(knowledgeSourceController.update),
);

router.delete(
  "/:chatbotId/:sourceId",
  requireAuth,
  asyncHandler(knowledgeSourceController.delete),
);

export default router;
