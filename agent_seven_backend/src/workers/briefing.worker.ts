import { Worker } from 'bullmq';
import { BriefingJobData, bullMQConnection } from '../config/queues';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';
import { llmService } from '../services/llm.service';
import { WorkspaceService } from '../modules/workspace/workspace.service';
import { gmailListThreads, gmailGetThread } from '../services/tools/gmail.tools';
import { calendarListEvents } from '../services/tools/calendar.tools';
import { slackListChannels } from '../services/tools/slack.tools';
import { classifyEmailBatch } from '../services/emailClassification.service';

export const briefingWorker = new Worker<BriefingJobData>(
  'briefing-jobs',
  async (job) => {
    const { type, tenantId, agentId } = job.data;

    switch (type) {
      case 'morning_briefing': {
        logger.info(`Running morning briefing for tenant ${tenantId}`);

        try {
          // 1. Get agent + verify enabled
          const agent = await prisma.agent.findFirst({ where: { id: agentId, tenantId } });
          if (!agent || !agent.morningBriefingEnabled) {
            logger.info(`Morning briefing skipped — disabled for agent ${agentId}`);
            break;
          }

          // 2. Get org admin user
          const user = await prisma.user.findFirst({
            where: { tenantId, isOrgAdmin: true },
          });
          if (!user) {
            logger.warn(`Morning briefing: no org admin found for tenant ${tenantId}`);
            break;
          }

          // 3. Get all active workspaces
          const workspaces = await prisma.workspace.findMany({
            where: {
              tenantId,
              status: { in: ['ACTIVE'] }
            }
          });

          const googleWorkspaces = workspaces.filter(
            (ws) => ws.provider === 'GOOGLE',
          );
          const slackWorkspaces = workspaces.filter(
            (ws) => ws.provider === 'SLACK',
          );

          logger.info(
            `Morning briefing: ${googleWorkspaces.length} Google, ${slackWorkspaces.length} Slack workspaces`,
          );

          // 4. Collect briefing data
          const briefingData = {
            emails: [] as any[],
            calendarEvents: [] as any[],
            actionItems: [] as any[],
            slackSummary: [] as any[],
            driftAlerts: [] as any[],
          };

          // Fetch emails + calendar from each Google workspace
          for (const ws of googleWorkspaces) {
            try {
              const wsData = await WorkspaceService.getWorkspaceWithDecryptedToken(ws.id, tenantId);
              const token = wsData.decryptedAccessToken;

              // Get unread emails from last 24h
              const emails = await gmailListThreads(token, {
                maxResults: 10,
                query: 'is:unread newer_than:1d',
              });
              if (emails?.length) {
                briefingData.emails.push({
                  workspace: ws.name,
                  workspaceEmail: ws.providerEmail,
                  emails: emails.slice(0, 5),
                });
              }

              // Get today's calendar events
              const today = new Date();
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              today.setHours(0, 0, 0, 0);
              tomorrow.setHours(0, 0, 0, 0);

              const events = await calendarListEvents(token, {
                timeMin: today.toISOString(),
                timeMax: tomorrow.toISOString(),
                maxResults: 10,
              });
              if (events?.length) {
                briefingData.calendarEvents.push({
                  workspace: ws.name,
                  events,
                });
              }
            } catch (err: any) {
              logger.warn(
                `Morning briefing: failed to fetch from workspace ${ws.id}: ${err.message}`,
              );
            }
          }

          // Fetch Slack summary
          for (const ws of slackWorkspaces) {
            try {
              const wsData = await WorkspaceService.getWorkspaceWithDecryptedToken(ws.id, tenantId);
              const token = wsData.decryptedAccessToken;
              const channels = await slackListChannels(token, {});
              if (channels?.length) {
                briefingData.slackSummary.push({
                  workspace: ws.name,
                  channelCount: channels.length,
                  channels: channels.slice(0, 3).map((c: any) => c.name),
                });
              }
            } catch (err: any) {
              logger.warn(
                `Morning briefing: failed to fetch Slack for workspace ${ws.id}: ${err.message}`,
              );
            }
          }

          // Fetch open action items
          const actionItems = await prisma.actionItem.findMany({
            where: {
              tenantId,
              agentId,
              status: { in: ['OPEN', 'IN_PROGRESS'] },
            },
            orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
            take: 10,
          });
          briefingData.actionItems = actionItems.map((item) => ({
            title: item.title,
            status: item.status,
            dueAt: item.dueAt,
            isOverdue: item.dueAt ? item.dueAt < new Date() : false,
          }));

          // Fetch critical drift alerts (graceful if table doesn't exist)
          const driftAlerts = await (prisma as any).driftAlert
            ?.findMany({
              where: {
                tenantId,
                isDismissed: false,
                isActedOn: false,
                severity: { in: ['CRITICAL', 'HIGH'] },
              },
              take: 5,
            })
            .catch(() => []) ?? [];
          briefingData.driftAlerts = driftAlerts;

          // 5. Generate briefing using LLM
          const briefingDate = new Date().toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          const briefingPrompt = `
You are ${agent.name}, an AI Chief of Staff. Generate a morning briefing for your user.
Today is ${briefingDate}.
Timezone: ${agent.morningBriefingTimezone || 'Australia/Sydney'}

DATA COLLECTED:

UNREAD EMAILS (last 24 hours):
${
  briefingData.emails.length > 0
    ? briefingData.emails
        .map(
          (w) =>
            `${w.workspaceEmail}:\n${w.emails.map((e: any) => `  - From: ${e.from} | Subject: ${e.subject}`).join('\n')}`,
        )
        .join('\n')
    : 'No unread emails'
}

TODAY'S CALENDAR:
${
  briefingData.calendarEvents.length > 0
    ? briefingData.calendarEvents
        .map((w) => w.events.map((e: any) => `  - ${e.start}: ${e.summary}`).join('\n'))
        .join('\n')
    : 'No meetings today'
}

OPEN ACTION ITEMS (${briefingData.actionItems.length} total):
${
  briefingData.actionItems.length > 0
    ? briefingData.actionItems
        .map(
          (i) =>
            `  - ${i.isOverdue ? '⚠️ OVERDUE: ' : ''}${i.title}${i.dueAt ? ` (due ${new Date(i.dueAt).toLocaleDateString()})` : ''}`,
        )
        .join('\n')
    : 'No open action items'
}

CRITICAL ALERTS (${briefingData.driftAlerts.length}):
${briefingData.driftAlerts.length > 0 ? briefingData.driftAlerts.map((d: any) => `  - ${d.title}`).join('\n') : 'None'}

SLACK:
${
  briefingData.slackSummary.length > 0
    ? briefingData.slackSummary.map((s) => `${s.workspace}: ${s.channelCount} channels`).join('\n')
    : 'No Slack workspaces connected'
}

Generate a concise, structured morning briefing. Format:

## Good morning! Here's your briefing for ${briefingDate}

### 📧 Email Summary
[summarize key emails needing attention, max 3-4 bullet points]

### 📅 Today's Schedule  
[list today's meetings/events]

### ✅ Action Items
[highlight overdue + due today items]

### ⚠️ Needs Attention
[critical drift alerts or urgent items, skip if none]

### 💡 Priority Focus
[one sentence: the single most important thing to focus on today]

Keep it concise, actionable, and written in a professional but friendly tone.
`;

          const briefingContent = await llmService.classifyWithHaiku(briefingPrompt);

          // 6. Save briefing as Memory
          const briefingMemory = await prisma.memory.create({
            data: {
              tenantId,
              agentId,
              type: 'ACTIVITY_LOG',
              title: `Morning Briefing — ${briefingDate}`,
              content: briefingContent,
              isVerified: true,
              tags: ['morning_briefing', 'auto_generated'],
            },
          });

          // 7. (Skipped Notification creation since it's not in schema)

          // 8. Write Audit Log
          await prisma.auditLog.create({
            data: {
              tenantId,
              action: 'agent.morning_briefing',
              resourceType: 'memory',
              resourceId: briefingMemory.id,
              metaJson: JSON.stringify({
                emailsChecked: briefingData.emails.reduce((acc, w) => acc + w.emails.length, 0),
                eventsFound: briefingData.calendarEvents.reduce(
                  (acc, w) => acc + w.events.length,
                  0,
                ),
                actionItemsFound: briefingData.actionItems.length,
                workspacesChecked: workspaces.length,
              }),
            },
          });

          logger.info(
            `Morning briefing completed for tenant ${tenantId} — memory ID: ${briefingMemory.id}`,
          );
        } catch (err: any) {
          logger.error(`Morning briefing failed for tenant ${tenantId}: ${err.message}`);
          throw err;
        }

        break;
      }

      case 'drift_check': {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        const openItems = await prisma.actionItem.findMany({
          where: {
            tenantId,
            agentId,
            status: 'OPEN',
            createdAt: { lt: threeDaysAgo },
          },
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
                description: `No progress detected for original item: ${item.title}`,
              },
            });
          }
        }
        break;
      }

      case 'reply_tracking': {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const sentEmails = await prisma.memory.findMany({
          where: {
            tenantId,
            agentId,
            type: 'ACTIVITY_LOG',
            content: { contains: 'sent' },
            createdAt: { lt: twoDaysAgo },
          },
        });

        for (const email of sentEmails) {
          await prisma.actionItem.create({
            data: {
              tenantId,
              agentId,
              title: `No reply received: ${email.title}`,
              description: `Follow up on email: ${email.title}`,
            },
          });
        }
        break;
      }

      case 'email_triage': {
        // Support both 'GOOGLE'/'google' and both 'ACTIVE'/'active' status values
        const emailWorkspaces = await prisma.workspace.findMany({
          where: {
            tenantId,
            provider: 'GOOGLE',
            status: 'ACTIVE',
          },
        });

        logger.info(
          `Email triage: found ${emailWorkspaces.length} Google workspaces for tenant ${tenantId}`,
        );

        let totalUrgent = 0;
        let totalImportant = 0;

        for (const ws of emailWorkspaces) {
          try {
            const workspaceWithToken = await WorkspaceService.getWorkspaceWithDecryptedToken(
              ws.id,
              tenantId,
            );
            const token = workspaceWithToken.decryptedAccessToken;

            const emails = await gmailListThreads(token, {
              maxResults: 30,
              query: 'is:unread OR newer_than:1d',
            });

            logger.info(
              `Email triage: fetched ${emails?.length || 0} emails from ${ws.name}`,
            );

            if (!emails || emails.length === 0) continue;

            const emailsToClassify: any[] = [];

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
                    body: thread?.messages?.[0]?.body || '',
                  });
                } catch (e) {
                  emailsToClassify.push({
                    messageId: email.threadId,
                    threadId: email.threadId,
                    subject: email.subject || '(no subject)',
                    from: email.from || '',
                    snippet: email.snippet || '',
                  });
                }
              }),
            );

            const classifications = await classifyEmailBatch(tenantId, ws.id, emailsToClassify);
            logger.info(
              `Email triage: classified ${classifications.length} emails for workspace ${ws.name}`,
            );

            totalUrgent += classifications.filter((c) => c.priority === 'URGENT').length;
            totalImportant += classifications.filter((c) => c.priority === 'IMPORTANT').length;

            for (let i = 0; i < classifications.length; i++) {
              if (classifications[i].priority === 'URGENT') {
                await prisma.actionItem
                  .create({
                    data: {
                      tenantId,
                      agentId,
                      title: `Urgent Email: ${emailsToClassify[i].subject}`,
                      description: `From: ${emailsToClassify[i].from}\nReason: ${classifications[i].reason}\nSummary: ${classifications[i].summary}`,
                    },
                  })
                  .catch((err: any) => {
                    logger.warn(`Could not create action item for urgent email: ${err.message}`);
                  });
              }
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
              content: `Email triage completed: ${totalUrgent} urgent, ${totalImportant} important emails found.`,
            },
          });
        }

        logger.info(
          `Email triage completed for tenant ${tenantId}: ${totalUrgent} urgent, ${totalImportant} important`,
        );
        break;
      }

      default: {
        logger.warn(`Unknown briefing job type: ${type}`);
      }
    }
  },
  {
    connection: bullMQConnection,
  },
);

briefingWorker.on('failed', (job, err) => {
  logger.error(`Briefing job ${job?.id} failed with error ${err.message}`);
});

briefingWorker.on('error', (err) => {
  logger.error(`Briefing worker error: ${err.message}`);
});
