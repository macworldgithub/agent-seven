import { Queue } from 'bullmq'
import { createRedisConnection } from './redis'
import { logger } from '../utils/logger'

// Each queue gets its own dedicated Redis connection (BullMQ requirement)
export const agentQueue = new Queue('agent-jobs', { connection: createRedisConnection() })
export const briefingQueue = new Queue('briefing-jobs', { connection: createRedisConnection() })
export const schedulerQueue = new Queue('scheduler-jobs', { connection: createRedisConnection() })

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
