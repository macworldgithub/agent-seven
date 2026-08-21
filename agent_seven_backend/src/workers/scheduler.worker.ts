import { Worker } from 'bullmq';
import { SchedulerJobData, briefingQueue, schedulerQueue, bullMQConnection } from '../config/queues';
import { prisma } from '../config/db';
import cron from 'node-cron';
import { refreshGoogleToken } from '../services/oauth.service';
import { decrypt, encrypt } from '../utils/encryption';
import { logger } from '../utils/logger';

export const schedulerWorker = new Worker<SchedulerJobData>(
  'scheduler-jobs',
  async (job) => {
    const { type } = job.data;

    try {
      if (type === 'check_briefings') {
        const now = new Date();

        // Get all agents with morning briefing enabled
        const agents = await prisma.agent.findMany({
          where: { morningBriefingEnabled: true },
          select: {
            id: true,
            tenantId: true,
            morningBriefingTime: true,
            morningBriefingTimezone: true,
          },
        });

        logger.info(`Checking briefing schedule for ${agents.length} agents`);

        for (const agent of agents) {
          try {
            // Parse configured time (format: "HH:MM")
            const [configHour, configMinute] = (agent.morningBriefingTime || '08:00')
              .split(':')
              .map(Number);

            // Convert configured time from agent timezone to UTC for comparison
            const agentTimezone = agent.morningBriefingTimezone || 'Australia/Sydney';
            const nowInAgentTz = new Date(
              now.toLocaleString('en-US', { timeZone: agentTimezone }),
            );
            const agentHour = nowInAgentTz.getHours();
            const agentMinute = nowInAgentTz.getMinutes();

            // Check if current time matches configured time (within 5-minute window)
            const minutesDiff = Math.abs(
              agentHour * 60 + agentMinute - (configHour * 60 + configMinute),
            );

            if (minutesDiff > 4) continue; // Not time yet

            // Check if briefing already ran today (check from start of day in agent's timezone)
            const todayStart = new Date(
              new Date().toLocaleDateString('en-US', { timeZone: agentTimezone }),
            );

            const alreadyRan = await prisma.auditLog.findFirst({
              where: {
                tenantId: agent.tenantId,
                action: 'agent.morning_briefing',
                createdAt: { gte: todayStart },
              },
            });

            if (alreadyRan) {
              logger.info(
                `Morning briefing already ran today for tenant ${agent.tenantId}`,
              );
              continue;
            }

            // Add briefing job to queue
            await briefingQueue.add(
              'morning_briefing',
              {
                type: 'morning_briefing',
                tenantId: agent.tenantId,
                agentId: agent.id,
              },
              {
                jobId: `briefing-${agent.tenantId}-${now.toDateString()}`,
                attempts: 2,
                backoff: { type: 'exponential', delay: 10000 },
              },
            );

            logger.info(`Morning briefing scheduled for tenant ${agent.tenantId}`);
          } catch (err: any) {
            logger.warn(`Failed to schedule briefing for agent ${agent.id}: ${err.message}`);
          }
        }
      } else if (type === 'check_token_expiry') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const workspaces = await prisma.workspace.findMany({
          where: {
            status: 'ACTIVE',
            provider: 'GOOGLE',
            tokenExpiresAt: { lte: tomorrow },
          },
        });

        for (const workspace of workspaces) {
          if (workspace.refreshToken) {
            try {
              const decryptedRefreshToken = decrypt(workspace.refreshToken);
              const { accessToken, expiresAt } = await refreshGoogleToken(decryptedRefreshToken);
              await prisma.workspace.update({
                where: { id: workspace.id },
                data: { accessToken: encrypt(accessToken), tokenExpiresAt: expiresAt },
              });
            } catch (error: any) {
              await prisma.workspace.update({
                where: { id: workspace.id },
                data: { status: 'EXPIRED' },
              });

              await prisma.auditLog.create({
                data: {
                  tenantId: workspace.tenantId,
                  action: 'workspace.token_expired',
                  resourceType: 'Workspace',
                  resourceId: workspace.id,
                  metaJson: JSON.stringify({ error: error.message }),
                },
              });
            }
          }
        }
      } else if (type === 'cleanup_sessions') {
        const now = new Date();

        const sessions = await prisma.session.deleteMany({
          where: { expiresAt: { lt: now } },
        });

        const oauthStates = await prisma.oAuthState.deleteMany({
          where: { expiresAt: { lt: now } },
        });

        logger.info(
          `Cleanup: ${sessions.count} sessions, ${oauthStates.count} oauth states deleted.`,
        );
      } else if (type === 'run_email_triage') {
        // Get all tenants with active Google workspaces
        const tenants = await prisma.tenant.findMany({
          where: { workspaces: { some: { status: 'ACTIVE', provider: 'GOOGLE' } } },
        });

        for (const tenant of tenants) {
          const agent = await prisma.agent.findFirst({ where: { tenantId: tenant.id } });
          if (agent) {
            await briefingQueue.add('email_triage', {
              type: 'email_triage',
              tenantId: tenant.id,
              agentId: agent.id,
            });
          }
        }
      }
    } catch (error: any) {
      logger.error(`Scheduler job failed for type ${type}, job ${job.id}: ${error.message}`);
      throw error;
    }
  },
  { connection: bullMQConnection },
);

schedulerWorker.on('failed', (job, err) => {
  logger.error(`Scheduler job ${job?.id} failed with error ${err.message}`);
});

schedulerWorker.on('error', (err) => {
  logger.error(`Scheduler worker error: ${err.message}`);
});

// Check morning briefings every 5 minutes
cron.schedule('*/5 * * * *', () => {
  schedulerQueue.add(
    'check_briefings',
    { type: 'check_briefings' },
    { jobId: `check-briefings-${Date.now()}` },
  );
});

// Run email triage every 30 minutes
cron.schedule('*/30 * * * *', () => {
  schedulerQueue.add('run_email_triage', { type: 'run_email_triage' });
});

// Refresh tokens daily at 3am UTC
cron.schedule('0 3 * * *', () => {
  schedulerQueue.add('check_token_expiry', { type: 'check_token_expiry' });
});

// Cleanup sessions daily at 4am UTC
cron.schedule('0 4 * * *', () => {
  schedulerQueue.add('cleanup_sessions', { type: 'cleanup_sessions' });
});
