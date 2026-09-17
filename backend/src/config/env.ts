import 'dotenv/config';

const requiredEnv = (name: string): string => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: Number(process.env.PORT ?? 5000),
  MONGODB_URI: requiredEnv('MONGODB_URI'),

  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS ?? 12),

  JWT_ACCESS_SECRET: requiredEnv('JWT_ACCESS_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',

  JWT_REFRESH_SECRET: requiredEnv('JWT_REFRESH_SECRET'),
  REFRESH_TOKEN_TTL_DAYS: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),

  // R2 (S3-compatible) object storage. Optional at startup — nothing else in
  // the app depends on these yet, so a missing value only surfaces as an
  // error when a knowledge-source file-upload request is actually made,
  // rather than blocking the whole server from starting.
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  // Optional override for the S3 client endpoint — lets the same client talk
  // to a local S3-compatible server (e.g. MinIO) instead of Cloudflare R2.
  // Falls back to the R2_ACCOUNT_ID-derived endpoint when unset.
  R2_ENDPOINT: process.env.R2_ENDPOINT,

  // Redis connection for the BullMQ ingestion queue. Optional at startup,
  // same as R2 above — the API server and the worker both fall back to a
  // clear runtime error only when something actually tries to use the
  // queue, so the app keeps booting without Redis configured.
  REDIS_URL: process.env.REDIS_URL,
};