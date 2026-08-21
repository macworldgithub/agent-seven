import { Queue, Worker } from 'bullmq'
import { env } from './env'
import { logger } from '../utils/logger'

// BullMQ needs its own Redis connection config
// DO NOT reuse the main redis client for BullMQ
const bullMQConnection = {
  host: new URL(env.REDIS_URL.replace('rediss://', 'https://').replace('redis://', 'http://')).hostname,
  port: parseInt(new URL(env.REDIS_URL.replace('rediss://', 'https://').replace('redis://', 'http://')).port || '6379'),
  password: new URL(env.REDIS_URL.replace('rediss://', 'https://').replace('redis://', 'http://')).password,
  username: new URL(env.REDIS_URL.replace('rediss://', 'https://').replace('redis://', 'http://')).username || 'default',
  tls: env.REDIS_URL.startsWith('rediss://') ? {} : undefined,
  maxRetriesPerRequest: null,  // Required by BullMQ
  enableOfflineQueue: true,
  retryStrategy: (times: number) => Math.min(times * 500, 5000)
}

export const agentQueue = new Queue('agent-jobs', { connection: bullMQConnection })
export const briefingQueue = new Queue('briefing-jobs', { connection: bullMQConnection })
export const schedulerQueue = new Queue('scheduler-jobs', { connection: bullMQConnection })

export { bullMQConnection }

agentQueue.on('error', (err) => logger.error(`Agent queue error: ${err.message}`))
briefingQueue.on('error', (err) => logger.error(`Briefing queue error: ${err.message}`))
schedulerQueue.on('error', (err) => logger.error(`Scheduler queue error: ${err.message}`))

export type AgentJobData = {
  type: 'chat'
  tenantId: string
  userId: string
  conversationId: string | null
  message: string
}

export type BriefingJobData = {
  type: 'morning_briefing' | 'drift_check' | 'reply_tracking' | 'email_triage'
  tenantId: string
  agentId: string
}

export type SchedulerJobData = {
  type: 'check_briefings' | 'check_token_expiry' | 'cleanup_sessions' | 'run_email_triage'
}
