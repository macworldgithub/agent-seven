import { Request, Response, NextFunction } from 'express';
import { memoryService } from './memory.service';
import { MemoryType, ActionItemStatus } from '@prisma/client';
import { prisma } from '../../config/db';

async function getAgentIdForTenant(tenantId: string): Promise<string> {
  const agent = await prisma.agent.findFirst({ where: { tenantId } });
  if (!agent) {
      const created = await prisma.agent.create({
          data: {
              tenantId,
              name: 'Agent Seven',
              spokenName: 'Seven'
          }
      });
      return created.id;
  }
  return agent.id;
}

export const memoryController = {
  async getMemories(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const agentId = await getAgentIdForTenant(tenantId);
      
      const type = req.query.type as MemoryType;
      const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
      const search = req.query.search as string;
      
      const memories = await memoryService.getMemories(tenantId, agentId, { type, tags, search });
      res.json({ success: true, data: memories });
    } catch (err) {
      next(err);
    }
  },

  async getMemorySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const agentId = await getAgentIdForTenant(tenantId);
      
      const summary = await memoryService.getMemorySummary(tenantId, agentId);
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  },

  async exportMemories(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const agentId = await getAgentIdForTenant(tenantId);
      
      const jsonStr = await memoryService.exportMemories(tenantId, agentId);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="memories_export.json"');
      res.send(jsonStr);
    } catch (err) {
      next(err);
    }
  },

  async wipeMemories(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const agentId = await getAgentIdForTenant(tenantId);
      
      const result = await memoryService.wipeMemories(tenantId, agentId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async getMemoryById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const id = req.params.id as string;
      
      const memory = await memoryService.getMemoryById(id, tenantId);
      res.json({ success: true, data: memory });
    } catch (err: any) {
      if (err.message === 'Memory not found') {
        res.status(404).json({ success: false, error: 'Memory not found' });
        return;
      }
      next(err);
    }
  },

  async createMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const agentId = await getAgentIdForTenant(tenantId);
      
      const { type, title, content, tags, workspaceId, sourceRef } = req.body;
      const memory = await memoryService.createMemory({
        tenantId, agentId, type, title, content, tags, workspaceId, sourceRef
      });
      
      res.json({ success: true, data: memory });
    } catch (err) {
      next(err);
    }
  },

  async updateMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const id = req.params.id as string;
      const { title, content, tags } = req.body;
      
      const memory = await memoryService.updateMemory(id, tenantId, { title, content, tags });
      res.json({ success: true, data: memory });
    } catch (err: any) {
       if (err.message === 'Memory not found') {
        res.status(404).json({ success: false, error: 'Memory not found' });
        return;
      }
      next(err);
    }
  },

  async deleteMemory(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const id = req.params.id as string;
      
      await memoryService.deleteMemory(id, tenantId);
      res.json({ success: true, data: { deleted: true } });
    } catch (err: any) {
       if (err.message === 'Memory not found') {
        res.status(404).json({ success: false, error: 'Memory not found' });
        return;
      }
      next(err);
    }
  },

  async getActionItems(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const agentId = await getAgentIdForTenant(tenantId);
      const status = req.query.status as ActionItemStatus;
      
      const items = await memoryService.getActionItems(tenantId, agentId, status);
      res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  },

  async createActionItem(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const agentId = await getAgentIdForTenant(tenantId);
      const { title, description, status, dueAt } = req.body;
      
      const item = await memoryService.createActionItem(tenantId, agentId, { title, description, status, dueAt });
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  async updateActionItem(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const id = req.params.id as string;
      const { status, title, description, dueAt } = req.body;
      
      const item = await memoryService.updateActionItem(id, tenantId, { status, title, description, dueAt });
      res.json({ success: true, data: item });
    } catch (err: any) {
      if (err.message === 'ActionItem not found') {
        res.status(404).json({ success: false, error: 'ActionItem not found' });
        return;
      }
      next(err);
    }
  },

  async deleteActionItem(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = (req as any).user.tenantId;
      const id = req.params.id as string;
      
      await memoryService.deleteActionItem(id, tenantId);
      res.json({ success: true, data: { deleted: true } });
    } catch (err: any) {
       if (err.message === 'ActionItem not found') {
        res.status(404).json({ success: false, error: 'ActionItem not found' });
        return;
      }
      next(err);
    }
  }
};
