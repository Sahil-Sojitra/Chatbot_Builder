import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { requestLogger } from "./middleware/logger.middleware.js";
import { validateBody } from "./middleware/validate.js";
import { authController } from "./modules/auth/auth.controller.js";
import authRoutes from "./modules/auth/auth.routes.js";
import {
  changePasswordSchema,
  updateMeSchema,
} from "./modules/auth/auth.validation.js";
import { setupSwagger } from "./config/swagger.js";
import chatbotRoutes from "./modules/chatbots/chatbot.routes.js";
import publicChatbotRoutes from "./modules/chatbots/publicChatbot.routes.js";
import knowledgeSourceRoutes from "./modules/knowledge-sources/knowledgeSource.routes.js";
import organizationRoutes from "./modules/organizations/organization.routes.js";
import devRoutes from "./modules/dev/dev.routes.js";
import { asyncHandler } from "./shared/asyncHandler.js";

const app = express();

// Public widget endpoints allow requests from any origin (*).
// Dashboard & auth endpoints require explicit FRONTEND_ORIGIN with credentials
// for HttpOnly refresh-token cookies.
app.use(
  cors((req, callback) => {
    const isPublic =
      req.url &&
      (req.url.startsWith("/api/v1/public") ||
        req.url.startsWith("/api/v1/dev") ||
        req.url === "/" ||
        req.url.startsWith("/api-docs") ||
        req.url.startsWith("/docs"));
    if (isPublic) {
      return callback(null, { origin: true, credentials: false });
    }
    return callback(null, {
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    });
  }),
);
app.use(requestLogger);
app.use(express.json());
app.use(cookieParser());

// Mount Swagger documentation UI (/api-docs, /docs, /api-docs.json)
setupSwagger(app);

app.get("/", (_req, res) => {
  res.json({
    message: "Chatbot Builder API is running",
    docs: "/api-docs",
  });
});

// Public endpoints (embedded widgets, no cookies/auth required)
app.use("/api/v1/public/chatbots", publicChatbotRoutes);

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
// Developer troubleshooting & observability endpoints
app.use("/api/v1/dev", devRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
