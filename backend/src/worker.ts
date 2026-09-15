import { connectDatabase } from './database/connection.js';
import { createIngestionWorker } from './modules/knowledge-sources/ingestion/ingestion.worker.js';

async function startWorker(): Promise<void> {
  try {
    await connectDatabase();

    const worker = createIngestionWorker();

    worker.on('completed', (job) => {
      console.log(`Ingestion job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      console.error(`Ingestion job ${job?.id ?? 'unknown'} failed:`, error);
    });

    console.log('Ingestion worker started');
  } catch (error) {
    console.error('Worker startup failed:', error);
    process.exit(1);
  }
}

void startWorker();
