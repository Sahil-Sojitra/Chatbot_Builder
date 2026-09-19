import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { asyncHandler } from "../../shared/asyncHandler.js";
import { authController } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.validation.js";

const router = Router();

router.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(authController.register),
);

router.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(authController.login),
);

// Public: the refresh token cookie itself is the credential (the access token may be expired).
router.post("/refresh", asyncHandler(authController.refresh));

router.post("/logout", requireAuth, asyncHandler(authController.logout));

export default router;
