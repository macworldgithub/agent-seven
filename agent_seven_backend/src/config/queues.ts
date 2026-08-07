import { Queue } from 'bullmq'
import { redis } from './redis'

const connection = { connection: redis }

export const agentQueue = new Queue('agent-jobs', connection)
export const briefingQueue = new Queue('briefing-jobs', connection)
export const schedulerQueue = new Queue('scheduler-jobs', connection)

export type AgentJobData = {
  type: 'chat'
  tenantId: string
  userId: string
  conversationId: string | null
  message: string
}

export type BriefingJobData = {
  type: 'morning_briefing' | 'drift_check' | 'reply_tracking'
  tenantId: string
  agentId: string
}

export type SchedulerJobData = {
  type: 'check_briefings' | 'check_token_expiry' | 'cleanup_sessions'
}
