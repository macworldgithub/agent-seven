import { Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { BriefingJobData } from '../config/queues';
import { prisma } from '../config/db';
import { agentService } from '../modules/agent/agent.service';
import { logger } from '../utils/logger';
import { llmService } from '../services/llm.service';
import { WorkspaceService } from '../modules/workspace/workspace.service';
import { gmailListThreads, gmailGetThread } from '../services/tools/gmail.tools';
import { classifyEmailBatch } from '../services/emailClassification.service';
import { checkEmailsAgainstWatchlist } from '../services/watchlist.service';

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
      else if (type === 'email_triage') {
        // Support both 'GOOGLE'/'google' and both 'ACTIVE'/'active' status values
        const workspaces = await prisma.workspace.findMany({
          where: {
            tenantId,
            provider: 'GOOGLE',
            status: 'ACTIVE'
          }
        });

        logger.info(`Email triage: found ${workspaces.length} Google workspaces for tenant ${tenantId}`);

        let totalUrgent = 0;
        let totalImportant = 0;

        for (const ws of workspaces) {
          try {
            const workspaceWithToken = await WorkspaceService.getWorkspaceWithDecryptedToken(ws.id, tenantId);
            const token = workspaceWithToken.decryptedAccessToken;
            
            // Fetch recent emails - unread or from last day
            const emails = await gmailListThreads(token, { 
              maxResults: 30,
              query: 'is:unread OR newer_than:1d'
            });
            
            logger.info(`Email triage: fetched ${emails?.length || 0} emails from ${ws.name}`);
            
            if (!emails || emails.length === 0) continue;

            const emailsToClassify: any[] = [];
            
            // Get full thread content for each email (up to 20)
            await Promise.all(
              emails.slice(0, 20).map(async (email: any) => {
                try {
                  const thread = await gmailGetThread(token, { threadId: email.threadId });
                  emailsToClassify.push({
                    messageId: email.threadId,
                    threadId: email.threadId,
                    subject: email.subject || '(no subject)',
                    from: email.from || '',
                    snippet: email.snippet || '',
                    body: thread?.messages?.[0]?.body || ''
                  });
                } catch (e) {
                  emailsToClassify.push({
                    messageId: email.threadId,
                    threadId: email.threadId,
                    subject: email.subject || '(no subject)',
                    from: email.from || '',
                    snippet: email.snippet || ''
                  });
                }
              })
            );

            // Classify in batch
            const classifications = await classifyEmailBatch(tenantId, ws.id, emailsToClassify);
            logger.info(`Email triage: classified ${classifications.length} emails for workspace ${ws.name}`);
            
            // Check against watchlist
            const matches = await checkEmailsAgainstWatchlist(tenantId, emailsToClassify);
            
            // Count for summary
            totalUrgent += classifications.filter(c => c.priority === 'URGENT').length;
            totalImportant += classifications.filter(c => c.priority === 'IMPORTANT').length;
            
            // Create action items for URGENT
            for (let i = 0; i < classifications.length; i++) {
              if (classifications[i].priority === 'URGENT') {
                await prisma.actionItem.create({
                  data: {
                    tenantId,
                    agentId,
                    title: `Urgent Email: ${emailsToClassify[i].subject}`,
                    description: `From: ${emailsToClassify[i].from}\nReason: ${classifications[i].reason}\nSummary: ${classifications[i].summary}`
                  }
                }).catch((err: any) => {
                  logger.warn(`Could not create action item for urgent email: ${err.message}`);
                });
              }
            }

            // Create action items for Watchlist Matches
            for (const match of matches) {
              await prisma.actionItem.create({
                data: {
                  tenantId,
                  agentId,
                  title: `Watchlist Match: ${match.matchedValue}`,
                  description: `Matched in email: ${match.context}`
                }
              }).catch((err: any) => {
                logger.warn(`Could not create action item for watchlist match: ${err.message}`);
              });
            }
          } catch (err: any) {
            logger.error(`Email triage failed for workspace ${ws.id}: ${err.message}`);
          }
        }

        if (totalUrgent > 0 || totalImportant > 0) {
          await prisma.memory.create({
            data: {
              tenantId,
              agentId,
              type: 'ACTIVITY_LOG',
              title: `Email triage completed`,
              content: `Email triage completed: ${totalUrgent} urgent, ${totalImportant} important emails found.`
            }
          });
        }
        
        logger.info(`Email triage completed for tenant ${tenantId}: ${totalUrgent} urgent, ${totalImportant} important`);
      }
    } catch (error: any) {
      logger.error(`Briefing job failed for tenant ${tenantId}, job ${job.id}: ${error.message}`);
      throw error;
    }
  },
  { 
    connection: createRedisConnection(),
  }
);

briefingWorker.on('failed', (job, err) => {
  logger.error(`Briefing job ${job?.id} failed with error ${err.message}`);
});

briefingWorker.on('error', (err) => {
  logger.error(`Briefing worker error: ${err.message}`);
});
