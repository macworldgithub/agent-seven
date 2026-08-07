import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { SchedulerJobData, briefingQueue } from '../config/queues';
import { prisma } from '../config/db';
import { refreshGoogleToken } from '../services/oauth.service';
import { logger } from '../utils/logger';

export const schedulerWorker = new Worker<SchedulerJobData>(
  'scheduler-jobs',
  async (job) => {
    const { type } = job.data;

    try {
      if (type === 'check_briefings') {
        const agents = await prisma.agent.findMany({
          where: { morningBriefingEnabled: true }
        });

        for (const agent of agents) {
          const tz = agent.morningBriefingTimezone;
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          
          let currentTime;
          try {
            currentTime = formatter.format(new Date());
          } catch (e) {
            currentTime = new Intl.DateTimeFormat('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: false
            }).format(new Date());
          }
          
          if (currentTime.replace(/^24/, '00') === agent.morningBriefingTime.replace(/^24/, '00')) {
            const recentBriefing = await prisma.auditLog.findFirst({
              where: {
                tenantId: agent.tenantId,
                action: 'agent.morning_briefing',
                resourceType: 'Agent',
                resourceId: agent.id,
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
              }
            });

            if (!recentBriefing) {
              await briefingQueue.add('morning_briefing', {
                type: 'morning_briefing',
                tenantId: agent.tenantId,
                agentId: agent.id
              });
            }
          }
        }
      }
      else if (type === 'check_token_expiry') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const workspaces = await prisma.workspace.findMany({
          where: {
            status: 'ACTIVE',
            provider: 'GOOGLE',
            tokenExpiresAt: { lte: tomorrow }
          }
        });

        for (const workspace of workspaces) {
          if (workspace.refreshToken) {
            try {
              const { accessToken, expiresAt } = await refreshGoogleToken(workspace.refreshToken);
              await prisma.workspace.update({
                where: { id: workspace.id },
                data: { accessToken, tokenExpiresAt: expiresAt }
              });
            } catch (error: any) {
              await prisma.workspace.update({
                where: { id: workspace.id },
                data: { status: 'EXPIRED' }
              });

              await prisma.auditLog.create({
                data: {
                  tenantId: workspace.tenantId,
                  action: 'workspace.token_expired',
                  resourceType: 'Workspace',
                  resourceId: workspace.id,
                  metaJson: JSON.stringify({ error: error.message })
                }
              });
            }
          }
        }
      }
      else if (type === 'cleanup_sessions') {
        const now = new Date();
        
        const sessions = await prisma.session.deleteMany({
          where: { expiresAt: { lt: now } }
        });
        
        const oauthStates = await prisma.oAuthState.deleteMany({
          where: { expiresAt: { lt: now } }
        });

        logger.info(`Cleanup: ${sessions.count} sessions, ${oauthStates.count} oauth states deleted.`);
      }
    } catch (error: any) {
      logger.error(`Scheduler job failed for type ${type}, job ${job.id}: ${error.message}`);
      throw error;
    }
  },
  { connection: redis }
);

schedulerWorker.on('failed', (job, err) => {
  logger.error(`Scheduler job ${job?.id} failed with error ${err.message}`);
});
