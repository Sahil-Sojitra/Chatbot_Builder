import { Queue } from "bullmq";

import { getRedisConnection, isRedisConfigured } from "../../../shared/redis.js";

export const INGESTION_QUEUE_NAME = "knowledge-source-ingestion";

/**
 * Job payload is deliberately just the id — the worker re-reads everything
 * else (type, storageKey, sourceUrl/sourceText, status, ownership) straight
 * from the database at claim time. The client never supplies job data at
 * all; this is only ever constructed server-side, so there's no path for a
 * caller to smuggle in storageKey/organizationId/createdBy/status.
 */
export interface IngestionJobData {
  knowledgeSourceId: string;
}

let cachedQueue: Queue<IngestionJobData> | null = null;

const getIngestionQueue = (): Queue<IngestionJobData> => {
  if (!cachedQueue) {
    cachedQueue = new Queue<IngestionJobData>(INGESTION_QUEUE_NAME, {
      connection: getRedisConnection(),
    });
  }
  return cachedQueue;
};

/**
 * Enqueues a background ingestion job for a freshly created (PENDING)
 * knowledge source. Best-effort: if Redis isn't configured, or enqueueing
 * otherwise fails, this logs and returns rather than throwing — the
 * KnowledgeSource has already been created successfully by this point, and
 * the caller's HTTP response should reflect that regardless of queue
 * availability. The source simply stays PENDING until it's enqueued some
 * other way (e.g. once Redis is configured, or a future manual retry).
 *
 * `jobId` is set to the knowledge source id so BullMQ itself won't queue a
 * second in-flight job for the same source — this is a belt-and-suspenders
 * optimization, not the actual safety mechanism: the real race protection is
 * the atomic PENDING -> PROCESSING claim in knowledgeSourceRepository.
 */
export const enqueueIngestionJob = async (
  knowledgeSourceId: string,
): Promise<void> => {
  if (!isRedisConfigured()) {
    console.warn(
      `[ingestion] Redis is not configured; leaving knowledge source ${knowledgeSourceId} PENDING`,
    );
    return;
  }

  try {
    await getIngestionQueue().add(
      "ingest",
      { knowledgeSourceId },
      {
        jobId: knowledgeSourceId,
        removeOnComplete: true,
        removeOnFail: 1000,
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
      },
    );
  } catch (error) {
    console.error(
      `[ingestion] Failed to enqueue job for knowledge source ${knowledgeSourceId}:`,
      error,
    );
  }
};
