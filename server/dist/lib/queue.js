"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadQueue = exports.analyzeQueue = void 0;
const bullmq_1 = require("bullmq");
const redis_1 = require("./redis");
exports.analyzeQueue = new bullmq_1.Queue('analyze', {
    connection: redis_1.redisOptions,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 200,
        removeOnFail: 100
    }
});
exports.downloadQueue = new bullmq_1.Queue('download', {
    connection: redis_1.redisOptions,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 8000 },
        removeOnComplete: 200,
        removeOnFail: 100
    }
});
