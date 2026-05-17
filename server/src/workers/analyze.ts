import { Worker, Job } from 'bullmq';
import { redisOptions } from '../lib/redis';
import { extractVideoInfo } from '../lib/yt-dlp';
import { logger } from '../lib/logger';

const concurrency = Number(process.env.ANALYZE_QUEUE_CONCURRENCY || 2);

new Worker(
  'analyze',
  async (job: Job) => {
    logger.info({ jobId: job.id, url: job.data.url }, 'processing analyze job');
    const metadata = await extractVideoInfo(job.data.url);
    return metadata;
  },
  {
    connection: redisOptions,
    concurrency
  }
).on('completed', (job: Job | undefined) => {
  logger.info({ jobId: job?.id }, 'analyze job completed');
}).on('failed', (job: Job | undefined, err: Error) => {
  logger.error({ jobId: job?.id, err }, 'analyze job failed');
});
