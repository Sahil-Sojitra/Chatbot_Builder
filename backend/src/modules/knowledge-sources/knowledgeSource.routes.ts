import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { knowledgeSourceController } from "./knowledgeSource.controller.js";
import multer from "multer";
import {
  completeFileUploadSchema,
  createKnowledgeSourceSchema,
  initiateFileUploadSchema,
  updateKnowledgeSourceSchema,
  MAX_FILE_SIZE_BYTES,
} from "./knowledgeSource.validation.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});

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

router.post(
  "/:chatbotId/upload-direct",
  requireAuth,
  upload.any(),
  asyncHandler(knowledgeSourceController.uploadDirect),
);

router.get(
  "/",
  requireAuth,
  asyncHandler(knowledgeSourceController.list),
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

router.post(
  "/:chatbotId/:sourceId/retry",
  requireAuth,
  asyncHandler(knowledgeSourceController.retry),
);

export default router;
