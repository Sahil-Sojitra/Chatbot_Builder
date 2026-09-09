import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export interface AccessTokenPayload {
  /** User _id */
  sub: string;
  /** Session _id this token belongs to */
  sid: string;
}

const signOptions = {
  expiresIn: env.JWT_ACCESS_EXPIRES_IN as `${number}${"m" | "h" | "d"}`,
} satisfies jwt.SignOptions;

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign({ ...payload }, env.JWT_ACCESS_SECRET, signOptions);

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    typeof (decoded as Record<string, unknown>).sub !== "string" ||
    typeof (decoded as Record<string, unknown>).sid !== "string"
  ) {
    throw new Error("Malformed access token payload");
  }

  const { sub, sid } = decoded as Record<string, unknown>;
  return { sub: sub as string, sid: sid as string };
};

/** Opaque refresh token handed to the client. */
export const generateRefreshToken = (): string =>
  crypto.randomBytes(48).toString("base64url");

/** Deterministic hash of a refresh token for at-rest storage. */
export const hashRefreshToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");
