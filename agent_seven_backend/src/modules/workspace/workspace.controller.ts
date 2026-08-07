import { Request, Response, NextFunction } from 'express';
import { WorkspaceService } from './workspace.service';
import { WorkspaceProvider } from '@prisma/client';
import { env } from '../../config/env';

export class WorkspaceController {
  static async initiateGoogleOAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { url } = await WorkspaceService.initiateOAuth(tenantId, WorkspaceProvider.GOOGLE);
      res.json({ success: true, data: { url } });
    } catch (error) {
      next(error);
    }
  }

  static async handleGoogleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.redirect(`${env.FRONTEND_URL}/onboarding?step=4&workspaceError=missing_params`);
      }

      if (state === 'auth_login') {
        return res.redirect(`/api/auth/google/callback?code=${code}&state=${state}`);
      }

      await WorkspaceService.handleGoogleCallback(code as string, state as string);
      res.redirect(`${env.FRONTEND_URL}/onboarding?step=4&workspaceConnected=true`);
    } catch (error) {
      console.error('Google Callback Error:', error);
      res.redirect(`${env.FRONTEND_URL}/onboarding?step=4&workspaceError=failed`);
    }
  }

  static async initiateSlackOAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { url } = await WorkspaceService.initiateOAuth(tenantId, WorkspaceProvider.SLACK);
      res.json({ success: true, data: { url } });
    } catch (error) {
      next(error);
    }
  }

  static async handleSlackCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.redirect(`${env.FRONTEND_URL}/onboarding?step=4&workspaceError=missing_params`);
      }

      await WorkspaceService.handleSlackCallback(code as string, state as string);
      res.redirect(`${env.FRONTEND_URL}/onboarding?step=4&workspaceConnected=true`);
    } catch (error) {
      console.error('Slack Callback Error:', error);
      res.redirect(`${env.FRONTEND_URL}/onboarding?step=4&workspaceError=failed`);
    }
  }

  private static formatWorkspaceForClient(ws: any) {
    const { accessToken, refreshToken, ...safeWs } = ws;
    const now = new Date();
    return {
      ...safeWs,
      email: ws.providerEmail,
      provider: ws.provider.toLowerCase(),
      status: ws.tokenExpiresAt && ws.tokenExpiresAt < now ? 'expired' : ws.status.toLowerCase(),
      lastConnectedAt: ws.lastSuccessfulCallAt ?? ws.createdAt,
    };
  }

  static async getWorkspaces(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const workspaces = await WorkspaceService.getWorkspaces(tenantId);
      
      const safeWorkspaces = workspaces.map(WorkspaceController.formatWorkspaceForClient);
      
      res.json({ success: true, data: safeWorkspaces });
    } catch (error) {
      next(error);
    }
  }

  static async getWorkspaceById(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const workspace = await WorkspaceService.getWorkspaceById(id as string, tenantId);
      const safeWs = WorkspaceController.formatWorkspaceForClient(workspace);
      res.json({ success: true, data: safeWs });
    } catch (error) {
      next(error);
    }
  }

  static async updatePermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const { permissions } = req.body;
      const workspace = await WorkspaceService.updatePermissions(id as string, tenantId, permissions);
      const safeWs = WorkspaceController.formatWorkspaceForClient(workspace);
      res.json({ success: true, data: safeWs });
    } catch (error) {
      next(error);
    }
  }

  static async revokeWorkspace(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      await WorkspaceService.revokeWorkspace(id as string, tenantId);
      res.json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  }

  static async reconnectWorkspace(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const { url } = await WorkspaceService.reconnectWorkspace(id as string, tenantId);
      res.json({ success: true, data: { url } });
    } catch (error) {
      next(error);
    }
  }

  static async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const result = await WorkspaceService.testConnection(id as string, tenantId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async setDefaultWorkspace(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      await WorkspaceService.setDefaultWorkspace(id as string, tenantId);
      res.json({ success: true, data: null });
    } catch (error) {
      next(error);
    }
  }

  static async renameWorkspace(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;
      const { name } = req.body;
      const workspace = await WorkspaceService.renameWorkspace(id as string, tenantId, name);
      const safeWs = WorkspaceController.formatWorkspaceForClient(workspace);
      res.json({ success: true, data: safeWs });
    } catch (error) {
      next(error);
    }
  }
}
