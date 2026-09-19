import type { CookieOptions, Request, Response } from "express";

import { env } from "../config/env.js";

export const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

/**
 * Scoped to the auth router's mount prefix — covers /refresh (reads it) and
 * /logout (clears it), and nothing outside auth ever receives this cookie.
 */
const REFRESH_TOKEN_COOKIE_PATH = "/api/v1/auth";

const isProduction = env.NODE_ENV === "production";

/**
 * The frontend and backend are separate deployed services and may end up on
 * different registrable domains in production, so the cookie must be usable
 * cross-site there — that requires `SameSite=None`, which in turn requires
 * `Secure`. In local development the frontend/backend share "localhost" as
 * their site (only the port differs), so `Lax` is sufficient and avoids
 * requiring HTTPS on localhost.
 */
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: REFRESH_TOKEN_COOKIE_PATH,
};

export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...baseCookieOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, baseCookieOptions);
};

/** Reads the refresh token from the request's cookies (parsed by `cookie-parser`). Undefined if absent. */
export const getRefreshTokenFromRequest = (req: Request): string | undefined => {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  return typeof value === "string" ? value : undefined;
};
