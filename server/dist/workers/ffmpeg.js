"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
const logger_1 = require("../lib/logger");
const concurrency = Number(process.env.DOWNLOAD_QUEUE_CONCURRENCY || 1);
new bullmq_1.Worker('download', async (job) => {
    logger_1.logger.info({ jobId: job.id, data: job.data }, 'ffmpeg worker received download job');
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
}, {
    connection: redis_1.redisOptions,
    concurrency
}).on('completed', (job) => {
    logger_1.logger.info({ jobId: job?.id }, 'download worker completed job');
}).on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, err }, 'download worker failed job');
});
