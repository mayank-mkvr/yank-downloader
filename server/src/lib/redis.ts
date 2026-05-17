import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

export const redisOptions = {
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379)
  },
  password: process.env.REDIS_PASSWORD || undefined
};

export const redisClient: RedisClientType = createClient(redisOptions);

redisClient.on('error', (err: unknown) => {
  logger.error({ err }, 'Redis connection error');
});

export async function connectRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    logger.info('Redis connected');
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const value = await redisClient.get(key);
  return value ? JSON.parse(value) as T : null;
}

export async function setCache(key: string, value: unknown, ttlSeconds: number) {
  await redisClient.set(key, JSON.stringify(value), {
    EX: ttlSeconds
  });
}
