import { Request, Response } from 'express';
import { driveModuleService } from './drive.service';

export const driveController = {
  /**
   * GET /api/drive/files?workspaceId=&folderId=&mimeType=&query=&maxResults=
   */
  async listFiles(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId as string;
      const { workspaceId, folderId, mimeType, query, maxResults } = req.query as Record<string, string>;

      if (!workspaceId) {
        return res.status(400).json({ success: false, error: 'workspaceId is required' });
      }

      const files = await driveModuleService.listFiles(workspaceId, tenantId, {
        folderId,
        mimeType,
        query,
        maxResults: maxResults ? parseInt(maxResults, 10) : undefined,
      });

      return res.json({ success: true, data: files });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/drive/search?workspaceId=&q=&maxResults=
   */
  async searchFiles(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId as string;
      const { workspaceId, q, maxResults } = req.query as Record<string, string>;

      if (!workspaceId || !q) {
        return res.status(400).json({ success: false, error: 'workspaceId and q are required' });
      }

      const files = await driveModuleService.searchFiles(
        workspaceId,
        tenantId,
        q,
        maxResults ? parseInt(maxResults, 10) : undefined
      );

      return res.json({ success: true, data: files });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * GET /api/drive/files/:fileId?workspaceId=&includeContent=
   */
  async getFile(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId as string;
      const fileId = req.params.fileId as string;
      const { workspaceId, includeContent } = req.query as Record<string, string>;

      if (!workspaceId) {
        return res.status(400).json({ success: false, error: 'workspaceId is required' });
      }

      const file = await driveModuleService.getFile(
        workspaceId,
        tenantId,
        fileId,
        includeContent === 'true'
      );

      return res.json({ success: true, data: file });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/drive/documents
   * Body: { workspaceId, title, content }
   */
  async createDocument(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId as string;
      const { workspaceId, title, content } = req.body;

      if (!workspaceId || !title) {
        return res.status(400).json({ success: false, error: 'workspaceId and title are required' });
      }

      const doc = await driveModuleService.createDocument(workspaceId, tenantId, title, content || '');

      return res.json({ success: true, data: doc });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },

  /**
   * POST /api/drive/generate
   * Body: { workspaceId, type, title, data, brandConfig? }
   */
  async generateDocument(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId as string;
      const { workspaceId, type, title, data, brandConfig } = req.body;

      if (!workspaceId || !type || !title) {
        return res.status(400).json({ success: false, error: 'workspaceId, type and title are required' });
      }

      const doc = await driveModuleService.generateDocument(
        workspaceId,
        tenantId,
        type,
        title,
        data || {},
        brandConfig
      );

      return res.json({ success: true, data: doc });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  },
};
