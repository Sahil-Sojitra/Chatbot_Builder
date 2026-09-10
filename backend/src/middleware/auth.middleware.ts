import type { RequestHandler } from "express";

import { unauthorized } from "../shared/errors.js";
import { verifyAccessToken } from "../shared/jwt.js";

/**
 * Requires a valid `Authorization: Bearer <accessToken>` header. The JWT
 * signature and expiration are sufficient proof of identity — there is no
 * server-side session to look up.
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    next(unauthorized("Missing or malformed Authorization header"));
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    next(unauthorized("Invalid or expired access token"));
    return;
  }

  req.auth = { userId: payload.sub };
  next();
};
