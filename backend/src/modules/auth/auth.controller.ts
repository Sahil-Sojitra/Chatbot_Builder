import type { Request, Response } from "express";

import { unauthorized } from "../../shared/errors.js";
import { sendSuccess } from "../../shared/http.js";
import { authService } from "./auth.service.js";
import type { LoginInput, RefreshInput, RegisterInput } from "./auth.types.js";

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body as RegisterInput);
    sendSuccess(res, result, 201);
  },

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginInput);
    sendSuccess(res, result, 200);
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const result = await authService.refresh(req.body as RefreshInput);
    sendSuccess(res, result, 200);
  },

  async logout(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }
    // No server-side session to invalidate — the client discards its
    // access/refresh tokens. The short-lived access JWT expires naturally.
    sendSuccess(res, { message: "Logged out successfully" }, 200);
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }
    const result = await authService.me(req.auth.userId);
    sendSuccess(res, result, 200);
  },
};
