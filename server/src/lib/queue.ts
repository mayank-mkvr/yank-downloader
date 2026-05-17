import { Queue } from 'bullmq';
import { redisOptions } from './redis';

export const analyzeQueue = new Queue('analyze', {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 200,
    removeOnFail: 100
  }
});

export const downloadQueue = new Queue('download', {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 8000 },
    removeOnComplete: 200,
    removeOnFail: 100
  }
});
