import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  retryStrategy(times) {
    if (times > 3) {
      logger.warn('Redis connection failed after 3 attempts. Stopping retries.');
      return null;
    }
    return Math.min(times * 1000, 3000);
  },
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error(`Redis connection error: ${err instanceof Error ? err.message : String(err)}`);
});
