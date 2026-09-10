import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export interface AccessTokenPayload {
  /** User _id */
  sub: string;
}

const accessSignOptions = {
  expiresIn: env.JWT_ACCESS_EXPIRES_IN as `${number}${"m" | "h" | "d"}`,
} satisfies jwt.SignOptions;

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign({ ...payload }, env.JWT_ACCESS_SECRET, accessSignOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as Record<string, unknown>).sub !== "string"
  ) {
    throw new Error("Malformed access token payload");
  }

  const { sub } = decoded as Record<string, unknown>;
  return { sub: sub as string };
};

/**
 * Refresh tokens are stateless: a JWT signed with its own secret
 * (JWT_REFRESH_SECRET) and a longer expiry than the access token. There is
 * no server-side record of issued refresh tokens — validating one is pure
 * signature + expiry verification, no database lookup.
 */
export interface RefreshTokenPayload {
  sub: string;
}

const refreshSignOptions = {
  expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` as `${number}d`,
} satisfies jwt.SignOptions;

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign({ ...payload }, env.JWT_REFRESH_SECRET, refreshSignOptions);

/** Throws jwt.TokenExpiredError or jwt.JsonWebTokenError on failure. */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof decoded.sub !== "string"
  ) {
    throw new jwt.JsonWebTokenError("Malformed refresh token payload");
  }

  return { sub: decoded.sub };
};
