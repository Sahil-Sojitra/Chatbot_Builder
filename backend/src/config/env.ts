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

  // The single origin allowed to make credentialed (cookie-bearing) requests
  // to this API — the frontend's own origin. Defaults to the Next.js dev
  // server so local development works without extra setup; must be set to
  // the real deployed frontend origin in production.
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',

  S3_ENDPOINT: process.env.S3_ENDPOINT,
  S3_REGION: process.env.S3_REGION,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
  S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE === 'true',

  // Redis connection for the BullMQ ingestion queue. Optional at startup,
  // same as R2 above — the API server and the worker both fall back to a
  // clear runtime error only when something actually tries to use the
  // queue, so the app keeps booting without Redis configured.
  REDIS_URL: process.env.REDIS_URL,
};