import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { validateBody } from "./middleware/validate.js";
import { authController } from "./modules/auth/auth.controller.js";
import authRoutes from "./modules/auth/auth.routes.js";
import {
  changePasswordSchema,
  updateMeSchema,
} from "./modules/auth/auth.validation.js";
import chatbotRoutes from "./modules/chatbots/chatbot.routes.js";
import knowledgeSourceRoutes from "./modules/knowledge-sources/knowledgeSource.routes.js";
import organizationRoutes from "./modules/organizations/organization.routes.js";
import { asyncHandler } from "./shared/asyncHandler.js";

const app = express();

// A single explicit allowed origin (never `*`) so the browser will accept
// `Access-Control-Allow-Credentials: true` — required for the frontend to
// send/receive the HttpOnly refresh-token cookie cross-origin.
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.json({
    message: "Chatbot Builder API is running",
  });
});

// Auth endpoints
app.use("/api/v1/auth", authRoutes);
app.get("/api/v1/me", requireAuth, asyncHandler(authController.me));
app.patch(
  "/api/v1/me",
  requireAuth,
  validateBody(updateMeSchema),
  asyncHandler(authController.updateMe),
);
app.post(
  "/api/v1/me/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(authController.changePassword),
);
// Organization endpoints
app.use("/api/v1/organization", organizationRoutes);
// Chatbot endpoints
app.use("/api/v1/chatbots", chatbotRoutes);
// Knowledge source endpoints
app.use("/api/v1/knowledge-sources", knowledgeSourceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
