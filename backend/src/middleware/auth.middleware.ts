import type { RequestHandler } from "express";

import { authRepository } from "../modules/auth/auth.repository.js";
import { unauthorized } from "../shared/errors.js";
import { verifyAccessToken } from "../shared/jwt.js";

/**
 * Requires a valid `Authorization: Bearer <accessToken>` header whose session
 * still exists. Populates `req.auth` with the trusted user/session ids.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  void (async () => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw unauthorized("Missing or malformed Authorization header");
    }

    const token = header.slice("Bearer ".length).trim();

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw unauthorized("Invalid or expired access token");
    }

    const session = await authRepository.findSessionById(payload.sid);
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      throw unauthorized("Session is no longer valid");
    }

    req.auth = { userId: payload.sub, sessionId: payload.sid };
    next();
  })().catch(next);
};
