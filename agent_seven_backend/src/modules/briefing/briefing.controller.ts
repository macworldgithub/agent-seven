import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db';
import { briefingQueue } from '../../config/queues';
import { logger } from '../../utils/logger';

async function getAgentForTenant(tenantId: string) {
  return prisma.agent.findFirst({ where: { tenantId } });
}

export const briefingController = {
  /**
   * GET /api/briefing/latest
   * Returns the most recent morning briefing memory for the tenant.
   */
  async getLatestBriefing(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;

      const briefing = await prisma.memory.findFirst({
        where: {
          tenantId,
          type: 'ACTIVITY_LOG',
          tags: { has: 'morning_briefing' },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!briefing) {
        return res.json({ success: true, data: null });
      }

      return res.json({
        success: true,
        data: {
          id: briefing.id,
          title: briefing.title,
          content: briefing.content,
          createdAt: briefing.createdAt,
          preview: briefing.content?.substring(0, 150) ?? '',
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/briefing/history
   * Returns the last 30 briefing memories (list view).
   */
  async getBriefingHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const limit = Math.min(Number(req.query.limit) || 30, 100);

      const briefings = await prisma.memory.findMany({
        where: {
          tenantId,
          type: 'ACTIVITY_LOG',
          tags: { has: 'morning_briefing' },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
        },
      });

      const data = briefings.map((b) => ({
        id: b.id,
        title: b.title,
        createdAt: b.createdAt,
        preview: b.content?.substring(0, 150) ?? '',
      }));

      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/briefing/:id
   * Returns a specific briefing by memory ID (tenant-scoped).
   */
  async getBriefingById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const { id } = req.params;

      const briefing = await prisma.memory.findFirst({
        where: {
          id: id as string,
          tenantId,
          type: 'ACTIVITY_LOG',
          tags: { has: 'morning_briefing' },
        },
      });

      if (!briefing) {
        return res.status(404).json({ success: false, error: 'Briefing not found' });
      }

      return res.json({
        success: true,
        data: {
          id: briefing.id,
          title: briefing.title,
          content: briefing.content,
          createdAt: briefing.createdAt,
          preview: briefing.content?.substring(0, 150) ?? '',
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/briefing/trigger
   * Enqueues an immediate morning briefing job.
   */
  async triggerBriefing(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;

      const agent = await getAgentForTenant(tenantId);
      if (!agent) {
        return res.status(404).json({ success: false, error: 'Agent not found for tenant' });
      }

      await briefingQueue.add(
        'morning_briefing',
        {
          type: 'morning_briefing',
          tenantId,
          agentId: agent.id,
        },
        {
          jobId: `briefing-trigger-${tenantId}-${Date.now()}`,
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
        },
      );

      logger.info(`Manual briefing trigger for tenant ${tenantId}`);

      return res.json({
        success: true,
        data: { message: 'Morning briefing triggered. Ready in ~1 minute.' },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/briefing/status
   * Returns today's briefing status: hasRunToday, lastRanAt, nextScheduledAt, isEnabled, configuredTime.
   */
  async getBriefingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;

      const agent = await getAgentForTenant(tenantId);

      // Check today's start (UTC midnight)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const lastRun = await prisma.auditLog.findFirst({
        where: {
          tenantId,
          action: 'agent.morning_briefing',
          createdAt: { gte: todayStart },
        },
        orderBy: { createdAt: 'desc' },
      });

      const configuredTime = agent?.morningBriefingTime || '08:00';
      const [h, m] = configuredTime.split(':').map(Number);
      const timezone = agent?.morningBriefingTimezone || 'Australia/Sydney';

      // Compute next scheduled time string
      const nextRun = new Date();
      nextRun.setHours(h, m, 0, 0);
      if (nextRun <= new Date()) {
        nextRun.setDate(nextRun.getDate() + 1); // Tomorrow
      }
      const nextScheduledAt = nextRun.toLocaleString('en-AU', {
        timeZone: timezone,
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      return res.json({
        success: true,
        data: {
          hasRunToday: !!lastRun,
          lastRanAt: lastRun?.createdAt ?? null,
          nextScheduledAt,
          isEnabled: agent?.morningBriefingEnabled ?? false,
          configuredTime,
          timezone,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
