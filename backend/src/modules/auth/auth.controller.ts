import type { Request, Response } from "express";

import {
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  setRefreshTokenCookie,
} from "../../shared/cookies.js";
import { invalidRefreshToken, unauthorized } from "../../shared/errors.js";
import { sendSuccess } from "../../shared/http.js";
import { authService } from "./auth.service.js";
import type { ChangePasswordInput, LoginInput, RegisterInput, UpdateMeInput } from "./auth.types.js";

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body as RegisterInput);
    sendSuccess(res, result, 201);
  },

  async login(req: Request, res: Response): Promise<void> {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body as LoginInput,
    );

    setRefreshTokenCookie(res, refreshToken);
    sendSuccess(res, { user, accessToken }, 200);
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      throw invalidRefreshToken();
    }

    const result = await authService.refresh(refreshToken);
    sendSuccess(res, result, 200);
  },

  async logout(_req: Request, res: Response): Promise<void> {
    // No access token is required here, and no server-side session exists
    // to invalidate — this only ever clears the refresh-token cookie, which
    // needs no proof of identity beyond possessing it. Always succeeds, even
    // with no access token and even with no refresh cookie present, so the
    // client can safely call this unconditionally on logout.
    clearRefreshTokenCookie(res);
    sendSuccess(res, { message: "Logged out successfully" }, 200);
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }
    const result = await authService.me(req.auth.userId);
    sendSuccess(res, result, 200);
  },

  async updateMe(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }
    const result = await authService.updateMe(
      req.auth.userId,
      req.body as UpdateMeInput,
    );
    sendSuccess(res, result, 200);
  },

  async changePassword(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw unauthorized();
    }
    await authService.changePassword(
      req.auth.userId,
      req.body as ChangePasswordInput,
    );
    sendSuccess(res, { message: "Password changed successfully" }, 200);
  },
};
