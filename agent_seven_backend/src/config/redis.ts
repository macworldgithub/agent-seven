import Redis, { RedisOptions } from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

// Shared connection options
const isTls = env.REDIS_URL.startsWith('rediss://');

const sharedOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  reconnectOnError: (err: Error) => {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    return targetErrors.some(e => err.message.includes(e));
  },
  enableOfflineQueue: false,
  connectTimeout: 10000,
  lazyConnect: false,
  keepAlive: 10000,
  ...(isTls ? { tls: {} } : {}),
};

// Shared app-level Redis (for caching, pub/sub, etc.)
export const redis = new Redis(env.REDIS_URL, sharedOptions);

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error(`Redis connection error: ${err instanceof Error ? err.message : String(err)}`);
});

/**
 * Factory that creates a dedicated ioredis connection for BullMQ.
 * BullMQ workers use blocking commands (BLPOP/XREAD) that cannot share
 * a connection with regular app commands — each worker/queue needs its own.
 */
export function createRedisConnection(): Redis {
  const connOptions: RedisOptions = {
    ...sharedOptions,
    // BullMQ requires maxRetriesPerRequest=null on its own connections
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    lazyConnect: false,
  };
  const conn = new Redis(env.REDIS_URL, connOptions);

  conn.on('error', (err) => {
    logger.error(`BullMQ Redis connection error: ${err instanceof Error ? err.message : String(err)}`);
  });

  return conn;
}
