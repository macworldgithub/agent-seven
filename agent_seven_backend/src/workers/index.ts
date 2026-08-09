import './agent.worker'
import './briefing.worker'
import './scheduler.worker'
import cron from 'node-cron'
import { schedulerQueue } from '../config/queues'
import { logger } from '../utils/logger'

// Enqueue scheduler jobs on cron schedule
cron.schedule('*/5 * * * *', () => {
  schedulerQueue.add('check_briefings', { type: 'check_briefings' }).catch(err => logger.error(`Failed to add check_briefings: ${err.message}`))
})

cron.schedule('0 * * * *', () => {
  schedulerQueue.add('check_token_expiry', { type: 'check_token_expiry' }).catch(err => logger.error(`Failed to add check_token_expiry: ${err.message}`))
})

cron.schedule('0 0 * * *', () => {
  schedulerQueue.add('cleanup_sessions', { type: 'cleanup_sessions' }).catch(err => logger.error(`Failed to add cleanup_sessions: ${err.message}`))
})

logger.info('All workers and schedulers started')
