import express from "express";

import { requireAuth } from "./middleware/auth.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { authController } from "./modules/auth/auth.controller.js";
import authRoutes from "./modules/auth/auth.routes.js";
import organizationRoutes from "./modules/organizations/organization.routes.js";
import { asyncHandler } from "./shared/asyncHandler.js";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Chatbot Builder API is running",
  });
});

app.use("/api/v1/auth", authRoutes);
app.get("/api/v1/me", requireAuth, asyncHandler(authController.me));
app.use("/api/v1/organization", organizationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
