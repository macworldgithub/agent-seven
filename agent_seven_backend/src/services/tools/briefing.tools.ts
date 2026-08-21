import { PrismaClient } from '@prisma/client';
import { briefingQueue } from '../../config/queues';
import { logger } from '../../utils/logger';

export async function getMorningBriefing(
  prisma: PrismaClient,
  input: { tenantId: string; date?: string },
) {
  const { tenantId, date } = input;

  const whereClause: any = {
    tenantId,
    type: 'ACTIVITY_LOG',
    tags: { has: 'morning_briefing' },
  };

  // If a date is specified, filter by that date range
  if (date) {
    const targetDate = new Date(date);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    targetDate.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);

    whereClause.createdAt = {
      gte: targetDate,
      lt: nextDate,
    };
  }

  const briefing = await prisma.memory.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  if (!briefing) {
    return {
      found: false,
      message: "No briefing found for that date. Would you like me to generate one now?",
    };
  }

  return {
    found: true,
    id: briefing.id,
    title: briefing.title,
    content: briefing.content,
    createdAt: briefing.createdAt,
  };
}

export async function triggerMorningBriefing(input: { tenantId: string; agentId: string }) {
  const { tenantId, agentId } = input;

  await briefingQueue.add(
    'morning_briefing',
    {
      type: 'morning_briefing',
      tenantId,
      agentId,
    },
    {
      jobId: `briefing-agent-trigger-${tenantId}-${Date.now()}`,
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  logger.info(`Morning briefing triggered by agent for tenant ${tenantId}`);

  return {
    triggered: true,
    message: 'Briefing is generating now. It will be ready in about 1 minute. I will summarise it for you once it is complete.',
  };
}
