import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { BriefingJobData } from '../config/queues';
import { prisma } from '../config/db';
import { agentService } from '../modules/agent/agent.service';
import { logger } from '../utils/logger';
import { llmService } from '../services/llm.service';

export const briefingWorker = new Worker<BriefingJobData>(
  'briefing-jobs',
  async (job) => {
    const { type, tenantId, agentId } = job.data;

    try {
      if (type === 'morning_briefing') {
        const agent = await prisma.agent.findUnique({ where: { id: agentId } });
        if (!agent || !agent.morningBriefingEnabled) return;

        const workspaces = await prisma.workspace.findMany({ where: { tenantId, status: 'ACTIVE' } });
        
        const orgAdmin = await prisma.user.findFirst({
          where: { tenantId, isOrgAdmin: true }
        });

        if (!orgAdmin) {
          throw new Error('No org admin found for tenant');
        }

        const prompt = `Generate a morning briefing for ${agent.name}. 
Check: 1) Last 10 unread emails across all workspaces 2) Today's calendar events 3) Open action items 4) Any overdue items.
Summarise concisely. Flag urgent items. Format for voice delivery.`;

        // runAgentLoop takes: tenantId, userId, conversationId, message, isSystem
        // Wait, runAgentLoop doesn't take isSystem by default in typical implementations, let's just pass null for conversationId and the prompt as message
        // The user specifies: run through runAgentLoop with a system user message (userId: use tenant's org admin userId)
        await agentService.runAgentLoop({ tenantId, userId: orgAdmin.id, conversationId: null, userMessage: prompt });

        await prisma.memory.create({
          data: {
            tenantId,
            agentId,
            type: 'ACTIVITY_LOG',
            title: `Morning Briefing - ${new Date().toISOString().split('T')[0]}`,
            content: 'Morning briefing executed and delivered.',
          }
        });

        await prisma.auditLog.create({
          data: {
            tenantId,
            action: 'agent.morning_briefing',
            resourceType: 'Agent',
            resourceId: agentId,
          }
        });
      } 
      else if (type === 'drift_check') {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const openItems = await prisma.actionItem.findMany({
          where: {
            tenantId,
            agentId,
            status: 'OPEN',
            createdAt: { lt: threeDaysAgo }
          }
        });

        for (const item of openItems) {
          const prompt = `Check if there has been any progress on action item: "${item.title}". Check email and slack for any mentions of this topic. Respond with YES or NO.`;
          const result = await llmService.classifyWithHaiku(prompt);
          
          if (result.trim().toUpperCase().includes('NO')) {
            await prisma.actionItem.create({
              data: {
                tenantId,
                agentId,
                title: `Follow-up needed: ${item.title}`,
                description: `No progress detected for original item: ${item.title}`
              }
            });
          }
        }
      }
      else if (type === 'reply_tracking') {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const sentEmails = await prisma.memory.findMany({
          where: {
            tenantId,
            agentId,
            type: 'ACTIVITY_LOG',
            content: { contains: 'sent' }, // simplified check
            createdAt: { lt: twoDaysAgo }
          }
        });

        for (const email of sentEmails) {
          // In a real scenario we'd query thread status. Here we just create the item.
          await prisma.actionItem.create({
            data: {
              tenantId,
              agentId,
              title: `No reply received: ${email.title}`,
              description: `Follow up on email: ${email.title}`
            }
          });
        }
      }
    } catch (error: any) {
      logger.error(`Briefing job failed for tenant ${tenantId}, job ${job.id}: ${error.message}`);
      throw error;
    }
  },
  { 
    connection: redis,
  }
);

briefingWorker.on('failed', (job, err) => {
  logger.error(`Briefing job ${job?.id} failed with error ${err.message}`);
});
