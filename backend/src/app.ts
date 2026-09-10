import express from "express";

import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import authRoutes from "./modules/auth/auth.routes.js";
import organizationRoutes from "./modules/organizations/organization.routes.js";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Chatbot Builder API is running",
  });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/organization", organizationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
