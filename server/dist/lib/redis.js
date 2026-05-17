"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.redisOptions = void 0;
exports.connectRedis = connectRedis;
exports.getCache = getCache;
exports.setCache = setCache;
const redis_1 = require("redis");
const logger_1 = require("./logger");
exports.redisOptions = {
    socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379)
    },
    password: process.env.REDIS_PASSWORD || undefined
};
exports.redisClient = (0, redis_1.createClient)(exports.redisOptions);
exports.redisClient.on('error', (err) => {
    logger_1.logger.error({ err }, 'Redis connection error');
});
async function connectRedis() {
    if (!exports.redisClient.isOpen) {
        await exports.redisClient.connect();
        logger_1.logger.info('Redis connected');
    }
}
async function getCache(key) {
    const value = await exports.redisClient.get(key);
    return value ? JSON.parse(value) : null;
}
async function setCache(key, value, ttlSeconds) {
    await exports.redisClient.set(key, JSON.stringify(value), {
        EX: ttlSeconds
    });
}
