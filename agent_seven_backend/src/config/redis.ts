import Redis from 'ioredis'
import { env } from './env'
import { logger } from '../utils/logger'

const createRedisClient = () => {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableOfflineQueue: true,   // Allow queuing when disconnected
    connectTimeout: 10000,
    commandTimeout: 5000,
    retryStrategy: (times) => {
      if (times > 10) {
        logger.error('Redis: max retries exceeded')
        return null
      }
      const delay = Math.min(times * 500, 5000)
      logger.warn(`Redis: retrying connection in ${delay}ms (attempt ${times})`)
      return delay
    },
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
      return targetErrors.some(e => err.message.includes(e))
    },
    lazyConnect: false,
    keepAlive: 30000,
    family: 4 // Force IPv4
  })

  client.on('connect', () => logger.info('Connected to Redis'))
  client.on('ready', () => logger.info('Redis client ready'))
  client.on('error', (err) => logger.error(`Redis error: ${err.message}`))
  client.on('reconnecting', () => logger.warn('Redis reconnecting...'))
  client.on('close', () => logger.warn('Redis connection closed'))

  return client
}

export const redis = createRedisClient()
export default redis
