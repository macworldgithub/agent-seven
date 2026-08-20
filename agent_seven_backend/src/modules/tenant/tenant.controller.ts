import { Request, Response, NextFunction } from 'express';
import { tenantService } from './tenant.service';

export class TenantController {
  async getAdminOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tenantService.getAdminOverview(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAdminUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await tenantService.getAdminUsers(req.tenantId!);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async createAdminUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password, isOrgAdmin } = req.body;
      const adminUserId = req.user!.id;
      const user = await tenantService.createAdminUser(req.tenantId!, adminUserId, {
        name,
        email,
        password,
        isOrgAdmin,
      });
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId as string;
      const { isOrgAdmin, isActive } = req.body;
      const user = await tenantService.updateUserStatus(req.tenantId!, userId, { isOrgAdmin, isActive });
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async getAdminWorkspaces(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaces = await tenantService.getAdminWorkspaces(req.tenantId!);
      res.json({ success: true, data: workspaces });
    } catch (error) {
      next(error);
    }
  }

  async getAdminAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 50;
      const rawAction = req.query.action;
      const actionStr = typeof rawAction === 'string' ? rawAction : undefined;

      const data = await tenantService.getAdminAuditLogs(req.tenantId!, page, limit, actionStr);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAdminUsage(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await tenantService.getAdminUsage(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

export const tenantController = new TenantController();
