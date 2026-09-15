import { Redis } from "ioredis";

import { env } from "../config/env.js";
import { AppError } from "./errors.js";

/**
 * Lazily constructed, mirroring the R2 client in ./r2.ts — nothing connects
 * to Redis at module load, so the server (and, separately, the ingestion
 * worker) can boot with REDIS_URL unset and only fail when something
 * actually tries to use the queue. `maxRetriesPerRequest: null` is required
 * by BullMQ for both producer and worker connections.
 */
let cachedConnection: Redis | null = null;

export const isRedisConfigured = (): boolean => Boolean(env.REDIS_URL);

export const getRedisConnection = (): Redis => {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (!env.REDIS_URL) {
    throw new AppError(500, "INTERNAL_ERROR", "Redis is not configured");
  }

  cachedConnection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  return cachedConnection;
};
