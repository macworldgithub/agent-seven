import './agent.worker'
import './briefing.worker'
import './scheduler.worker'
import cron from 'node-cron'
import { schedulerQueue } from '../config/queues'
import { logger } from '../utils/logger'

// Enqueue scheduler jobs on cron schedule
cron.schedule('*/5 * * * *', () => {
  schedulerQueue.add('check_briefings', { type: 'check_briefings' })
})

cron.schedule('0 * * * *', () => {
  schedulerQueue.add('check_token_expiry', { type: 'check_token_expiry' })
})

cron.schedule('0 0 * * *', () => {
  schedulerQueue.add('cleanup_sessions', { type: 'cleanup_sessions' })
})

logger.info('All workers and schedulers started')
