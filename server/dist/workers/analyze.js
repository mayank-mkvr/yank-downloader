"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const redis_1 = require("../lib/redis");
const yt_dlp_1 = require("../lib/yt-dlp");
const logger_1 = require("../lib/logger");
const concurrency = Number(process.env.ANALYZE_QUEUE_CONCURRENCY || 2);
new bullmq_1.Worker('analyze', async (job) => {
    logger_1.logger.info({ jobId: job.id, url: job.data.url }, 'processing analyze job');
    const metadata = await (0, yt_dlp_1.extractVideoInfo)(job.data.url);
    return metadata;
}, {
    connection: redis_1.redisOptions,
    concurrency
}).on('completed', (job) => {
    logger_1.logger.info({ jobId: job?.id }, 'analyze job completed');
}).on('failed', (job, err) => {
    logger_1.logger.error({ jobId: job?.id, err }, 'analyze job failed');
});
