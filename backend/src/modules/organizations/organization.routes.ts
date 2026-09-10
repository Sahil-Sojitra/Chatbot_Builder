import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { organizationController } from "./organization.controller.js";
import { createOrganizationSchema } from "./organization.validation.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  validateBody(createOrganizationSchema),
  asyncHandler(organizationController.create),
);

export default router;
