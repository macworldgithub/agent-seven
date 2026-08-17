import { Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { AgentJobData } from '../config/queues';
import { agentService } from '../modules/agent/agent.service';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';

export const agentWorker = new Worker<AgentJobData>(
  'agent-jobs',
  async (job) => {
    const { type, tenantId, userId, conversationId, message } = job.data;

    if (type === 'chat') {
      try {
        await agentService.runAgentLoop({ tenantId, userId, conversationId, userMessage: message });
        logger.info(`Agent job completed for tenant ${tenantId}, job ${job.id}`);
      } catch (error: any) {
        logger.error(`Agent job failed for tenant ${tenantId}, job ${job.id}: ${error.message}`);
        
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'agent.job_failed',
            resourceType: 'AgentWorker',
            metaJson: JSON.stringify({ jobId: job.id, error: error.message }),
          }
        });
        throw error;
      }
    }
  },
  { 
    connection: createRedisConnection(),
    concurrency: 10 
  }
);

agentWorker.on('failed', (job, err) => {
  logger.error(`Agent job ${job?.id} failed with error ${err.message}`);
});

agentWorker.on('error', (err) => {
  logger.error(`Agent worker error: ${err.message}`);
});
