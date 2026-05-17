import { Worker, Job } from 'bullmq';
import { redisOptions } from '../lib/redis';
import { logger } from '../lib/logger';

const concurrency = Number(process.env.DOWNLOAD_QUEUE_CONCURRENCY || 1);

new Worker(
  'download',
  async (job: Job) => {
    logger.info({ jobId: job.id, data: job.data }, 'ffmpeg worker received download job');
    if (!job.data || !job.data.url || !job.data.formatId) {
      throw new Error('Download job data is incomplete');
    }
    // This worker exists to coordinate heavy merge tasks and retries.
    // The actual streaming endpoint still streams directly; completion is used
    // for diagnostics, retry behavior, and capacity throttling.
    return {
      status: 'accepted',
      requestedAt: new Date().toISOString()
    };
  },
  {
    connection: redisOptions,
    concurrency
  }
).on('completed', (job: Job | undefined) => {
  logger.info({ jobId: job?.id }, 'download worker completed job');
}).on('failed', (job: Job | undefined, err: Error) => {
  logger.error({ jobId: job?.id, err }, 'download worker failed job');
});
