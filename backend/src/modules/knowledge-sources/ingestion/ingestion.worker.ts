import { Worker } from "bullmq";
import type { Job } from "bullmq";

import { getRedisConnection } from "../../../shared/redis.js";
import { knowledgeSourceRepository } from "../knowledgeSource.repository.js";
import { acquireContent } from "./contentAcquisition.js";
import { INGESTION_QUEUE_NAME } from "./ingestion.queue.js";
import type { IngestionJobData } from "./ingestion.queue.js";

/**
 * Processes one ingestion job end to end:
 *   1. Atomically claim the source (PENDING -> PROCESSING). If nothing was
 *      claimed — already PROCESSING/READY/FAILED/DISABLED, or a duplicate
 *      job racing another worker — there is nothing to do.
 *   2. Acquire normalized text for the source's type.
 *   3. On success, mark READY. On failure, mark FAILED with the internal
 *      error message stored on the model's `error` field.
 *
 * Chunking/embedding/vector storage are intentionally not implemented here
 * yet — this worker stops once it has normalized text.
 */
const processIngestionJob = async (
  job: Job<IngestionJobData>,
): Promise<void> => {
  const { knowledgeSourceId } = job.data;

  const source = await knowledgeSourceRepository.claimForProcessing(
    knowledgeSourceId,
  );
  if (!source) {
    console.log(
      `[ingestion] Knowledge source ${knowledgeSourceId} was not PENDING; skipping`,
    );
    return;
  }

  try {
    const { text } = await acquireContent(source);
    console.log(
      `[ingestion] Acquired ${text.length} characters for knowledge source ${knowledgeSourceId}`,
    );
    await knowledgeSourceRepository.markReady(knowledgeSourceId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown ingestion error";
    console.error(
      `[ingestion] Failed for knowledge source ${knowledgeSourceId}:`,
      error,
    );
    await knowledgeSourceRepository.markFailed(knowledgeSourceId, message);
    throw error;
  }
};

export const createIngestionWorker = (): Worker<IngestionJobData> =>
  new Worker<IngestionJobData>(INGESTION_QUEUE_NAME, processIngestionJob, {
    connection: getRedisConnection(),
    concurrency: 5,
  });
