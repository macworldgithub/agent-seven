import { PrismaClient, MemoryType, ActionItemStatus } from '@prisma/client';
import { logger } from '../../utils/logger';

export async function memorySearch(prisma: PrismaClient, input: { tenantId: string, query: string, type?: MemoryType }): Promise<any> {
  const whereClause: any = {
    tenantId: input.tenantId,
    OR: [
      { title: { contains: input.query, mode: 'insensitive' } },
      { content: { contains: input.query, mode: 'insensitive' } }
    ]
  };

  if (input.type) {
    whereClause.type = input.type;
  }

  const results = await prisma.memory.findMany({
    where: whereClause,
    orderBy: { updatedAt: 'desc' },
    take: 10
  });

  return results;
}

export async function memorySave(prisma: PrismaClient, input: { tenantId: string, agentId: string, type: MemoryType, title: string, content: string, tags?: string[] }): Promise<any> {
  if (input.type === 'STAKEHOLDER') {
    const existing = await prisma.memory.findFirst({
      where: {
        tenantId: input.tenantId,
        agentId: input.agentId,
        type: 'STAKEHOLDER',
        title: input.title
      }
    });

    if (existing) {
      return prisma.memory.update({
        where: { id: existing.id },
        data: {
          content: input.content,
          tags: input.tags || existing.tags
        }
      });
    }
  }

  const memory = await prisma.memory.create({
    data: {
      tenantId: input.tenantId,
      agentId: input.agentId,
      type: input.type,
      title: input.title,
      content: input.content,
      tags: input.tags || [],
      isVerified: true
    }
  });

  return memory;
}

export async function getActionItems(prisma: PrismaClient, input: { tenantId: string, agentId: string, status?: ActionItemStatus }): Promise<any> {
  const whereClause: any = {
    tenantId: input.tenantId,
    agentId: input.agentId
  };

  if (input.status) {
    whereClause.status = input.status;
  }

  const results = await prisma.actionItem.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });

  return results;
}

export const saveActionItem = async (prisma: PrismaClient, input: {
  tenantId: string,
  agentId: string,
  title: string,
  description?: string,
  dueAt?: string
}) => {
  const item = await prisma.actionItem.create({
    data: {
      tenantId: input.tenantId,
      agentId: input.agentId,
      title: input.title,
      description: input.description || null,
      status: 'OPEN',
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    }
  })
  
  logger.info(`Action item saved: ${item.id} - ${item.title}`)
  return { success: true, actionItemId: item.id, title: item.title, status: item.status }
}
