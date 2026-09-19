import { Router } from "express";

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

// Public: logout only clears the refresh-token cookie — it never required a
// valid access token to do that, and must succeed even if the caller's
// access token is missing, expired, or was never issued (idempotent).
router.post("/logout", asyncHandler(authController.logout));

export default router;
