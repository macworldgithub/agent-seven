import { Memory, ActionItem, MemoryType, ActionItemStatus } from '@prisma/client';
import { prisma } from '../../config/db';

export const memoryService = {
  async getMemories(tenantId: string, agentId: string, filters?: { type?: MemoryType, tags?: string[], search?: string }): Promise<Memory[]> {
    const where: any = { tenantId, agentId };
    
    if (filters?.type) {
      where.type = filters.type;
    }
    
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }
    
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    return prisma.memory.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 50
    });
  },

  async getMemoryById(id: string, tenantId: string): Promise<Memory> {
    const memory = await prisma.memory.findFirst({
      where: { id, tenantId }
    });
    
    if (!memory) {
      throw new Error('Memory not found');
    }
    
    return memory;
  },

  async createMemory(data: { tenantId: string, agentId: string, workspaceId?: string, type: MemoryType, title: string, content: string, tags?: string[], sourceRef?: string }): Promise<Memory> {
    return prisma.memory.create({
      data: {
        ...data,
        isVerified: false
      }
    });
  },

  async updateMemory(id: string, tenantId: string, data: { title?: string, content?: string, tags?: string[] }): Promise<Memory> {
    const existing = await prisma.memory.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Memory not found');
    
    return prisma.memory.update({
      where: { id },
      data
    });
  },

  async deleteMemory(id: string, tenantId: string): Promise<void> {
    const existing = await prisma.memory.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Memory not found');
    
    await prisma.memory.delete({
      where: { id }
    });
  },

  async exportMemories(tenantId: string, agentId: string): Promise<string> {
    const memories = await prisma.memory.findMany({
      where: { tenantId, agentId }
    });
    
    return JSON.stringify(memories, null, 2);
  },

  async wipeMemories(tenantId: string, agentId: string): Promise<{ count: number }> {
    const [memoryDelete, _, __] = await prisma.$transaction([
      prisma.memory.deleteMany({ where: { tenantId, agentId } }),
      prisma.conversation.deleteMany({ where: { tenantId, agentId } }),
      prisma.auditLog.create({
        data: {
          tenantId,
          action: 'memory.wipe'
        }
      })
    ]);
    
    return { count: memoryDelete.count };
  },

  async getMemorySummary(tenantId: string, agentId: string): Promise<{ total: number, byType: Record<MemoryType, number>, lastUpdated: Date | null }> {
    const memories = await prisma.memory.findMany({
      where: { tenantId, agentId },
      select: { type: true, updatedAt: true }
    });
    
    const byType = {} as Record<MemoryType, number>;
    Object.values(MemoryType).forEach(type => byType[type] = 0);
    
    let lastUpdated: Date | null = null;
    
    memories.forEach(m => {
      byType[m.type] = (byType[m.type] || 0) + 1;
      if (!lastUpdated || m.updatedAt > lastUpdated) {
        lastUpdated = m.updatedAt;
      }
    });
    
    return {
      total: memories.length,
      byType,
      lastUpdated
    };
  },

  async loadContextForConversation(tenantId: string, agentId: string, userMessage: string, limit: number = 5): Promise<Memory[]> {
    const keywords = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    
    const orConditions = keywords.length > 0 ? keywords.map(kw => ({
      OR: [
        { title: { contains: kw, mode: 'insensitive' as const } },
        { content: { contains: kw, mode: 'insensitive' as const } }
      ]
    })) : [];
    
    let memories = await prisma.memory.findMany({
      where: {
        tenantId,
        agentId,
        OR: orConditions.length > 0 ? orConditions : undefined
      },
      orderBy: [
        { updatedAt: 'desc' }
      ]
    });
    
    const priority = ['DECISION', 'ACTION_ITEM', 'STAKEHOLDER'];
    memories.sort((a, b) => {
      const pA = priority.indexOf(a.type);
      const pB = priority.indexOf(b.type);
      
      const pAReal = pA === -1 ? 99 : pA;
      const pBReal = pB === -1 ? 99 : pB;
      
      if (pAReal !== pBReal) return pAReal - pBReal;
      return b.updatedAt.getTime() - a.updatedAt.getTime();
    });
    
    return memories.slice(0, limit);
  },

  async getActionItems(tenantId: string, agentId: string, status?: ActionItemStatus): Promise<ActionItem[]> {
    const where: any = { tenantId, agentId };
    if (status) {
      where.status = status;
    }
    
    return prisma.actionItem.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  },

  async createActionItem(tenantId: string, agentId: string, data: { title: string, description?: string, status?: ActionItemStatus, dueAt?: string | null }): Promise<ActionItem> {
    const createData: any = {
      tenantId,
      agentId,
      title: data.title,
      description: data.description,
    };
    if (data.status) createData.status = data.status;
    if (data.dueAt) createData.dueAt = new Date(data.dueAt);
    if (data.status === 'DONE') createData.completedAt = new Date();
    
    return prisma.actionItem.create({
      data: createData
    });
  },

  async updateActionItem(id: string, tenantId: string, data: { status?: ActionItemStatus, title?: string, description?: string, dueAt?: string | null }): Promise<ActionItem> {
    const existing = await prisma.actionItem.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('ActionItem not found');
    
    const updateData: any = { ...data };
    if (data.dueAt) {
      updateData.dueAt = new Date(data.dueAt);
    }
    if (data.status === 'DONE') {
      updateData.completedAt = new Date();
    }
    
    return prisma.actionItem.update({
      where: { id },
      data: updateData
    });
  },

  async deleteActionItem(id: string, tenantId: string): Promise<void> {
    const existing = await prisma.actionItem.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('ActionItem not found');
    
    await prisma.actionItem.delete({
      where: { id }
    });
  }
};
