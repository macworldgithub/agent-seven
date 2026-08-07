import crypto from 'crypto';
import { prisma } from '../../config/db';
import { Workspace, WorkspaceProvider, WorkspaceStatus, Permission, OAuthState } from '@prisma/client';
import { encrypt, decrypt } from '../../utils/encryption';
import { getGoogleAuthUrl, getSlackAuthUrl, exchangeGoogleCode, exchangeSlackCode, refreshGoogleToken } from '../../services/oauth.service';
import { google } from 'googleapis';
import { logger } from '../../utils/logger';

export class WorkspaceService {
  static async initiateOAuth(
    tenantId: string,
    provider: WorkspaceProvider
  ): Promise<{ url: string; state: string }> {
    const state = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.oAuthState.create({
      data: {
        tenantId,
        state,
        provider,
        expiresAt,
      },
    });

    let url = '';
    if (provider === WorkspaceProvider.GOOGLE) {
      url = getGoogleAuthUrl(state);
    } else if (provider === WorkspaceProvider.SLACK) {
      url = getSlackAuthUrl(state);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    return { url, state };
  }

  static async handleGoogleCallback(code: string, state: string): Promise<Workspace> {
    const oauthState = await prisma.oAuthState.findUnique({ where: { state } });

    if (!oauthState) throw new Error('Invalid state');
    if (oauthState.used) throw new Error('State already used');
    if (oauthState.expiresAt < new Date()) throw new Error('State expired');
    if (oauthState.provider !== WorkspaceProvider.GOOGLE) throw new Error('Provider mismatch');

    await prisma.oAuthState.update({
      where: { id: oauthState.id },
      data: { used: true },
    });

    const tokenData = await exchangeGoogleCode(code);
    const encryptedAccessToken = encrypt(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken ? encrypt(tokenData.refreshToken) : undefined;

    let workspace = await prisma.workspace.findFirst({
      where: {
        tenantId: oauthState.tenantId,
        provider: WorkspaceProvider.GOOGLE,
        providerAccountId: tokenData.providerAccountId,
      },
    });

    if (workspace) {
      workspace = await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          accessToken: encryptedAccessToken,
          ...(encryptedRefreshToken && { refreshToken: encryptedRefreshToken }),
          tokenExpiresAt: tokenData.expiresAt,
          status: WorkspaceStatus.ACTIVE,
          providerEmail: tokenData.email,
        },
      });
    } else {
      const defaultCount = await prisma.workspace.count({ where: { tenantId: oauthState.tenantId, isDefault: true } });
      workspace = await prisma.workspace.create({
        data: {
          tenantId: oauthState.tenantId,
          name: tokenData.email || 'Google Workspace',
          provider: WorkspaceProvider.GOOGLE,
          providerAccountId: tokenData.providerAccountId,
          providerEmail: tokenData.email,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: tokenData.expiresAt,
          isDefault: defaultCount === 0,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: oauthState.tenantId,
        action: 'workspace.connect',
        resourceType: 'workspace',
        resourceId: workspace.id,
      },
    });

    return workspace;
  }

  static async handleSlackCallback(code: string, state: string): Promise<Workspace> {
    const oauthState = await prisma.oAuthState.findUnique({ where: { state } });

    if (!oauthState) throw new Error('Invalid state');
    if (oauthState.used) throw new Error('State already used');
    if (oauthState.expiresAt < new Date()) throw new Error('State expired');
    if (oauthState.provider !== WorkspaceProvider.SLACK) throw new Error('Provider mismatch');

    await prisma.oAuthState.update({
      where: { id: oauthState.id },
      data: { used: true },
    });

    const tokenData = await exchangeSlackCode(code);
    const encryptedAccessToken = encrypt(tokenData.accessToken);

    let workspace = await prisma.workspace.findFirst({
      where: {
        tenantId: oauthState.tenantId,
        provider: WorkspaceProvider.SLACK,
        providerAccountId: tokenData.teamId,
      },
    });

    if (workspace) {
      workspace = await prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          accessToken: encryptedAccessToken,
          status: WorkspaceStatus.ACTIVE,
          providerEmail: tokenData.email,
        },
      });
    } else {
      const defaultCount = await prisma.workspace.count({ where: { tenantId: oauthState.tenantId, isDefault: true } });
      workspace = await prisma.workspace.create({
        data: {
          tenantId: oauthState.tenantId,
          name: tokenData.teamName || 'Slack Workspace',
          provider: WorkspaceProvider.SLACK,
          providerAccountId: tokenData.teamId,
          providerEmail: tokenData.email,
          accessToken: encryptedAccessToken,
          isDefault: defaultCount === 0,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: oauthState.tenantId,
        action: 'workspace.connect',
        resourceType: 'workspace',
        resourceId: workspace.id,
      },
    });

    return workspace;
  }

  static async getWorkspaces(tenantId: string) {
    return prisma.workspace.findMany({
      where: { 
        tenantId,
        status: { not: WorkspaceStatus.REVOKED }
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async getWorkspaceById(id: string, tenantId: string) {
    const workspace = await prisma.workspace.findFirst({
      where: { id, tenantId },
    });
    if (!workspace) throw new Error('Workspace not found');
    return workspace;
  }

  static async updatePermissions(id: string, tenantId: string, permissions: Permission[]): Promise<Workspace> {
    const workspace = await prisma.workspace.update({
      where: { id },
      data: { permissions },
    });

    // Check ownership
    if (workspace.tenantId !== tenantId) throw new Error('Workspace not found');

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: 'workspace.permissions_updated',
        resourceType: 'workspace',
        resourceId: workspace.id,
        metaJson: JSON.stringify({ permissions }),
      },
    });

    return workspace;
  }

  static async revokeWorkspace(id: string, tenantId: string): Promise<void> {
    const workspace = await this.getWorkspaceById(id, tenantId);

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        status: WorkspaceStatus.REVOKED,
        accessToken: '', // Clearing token. Alternatively can put dummy value if schema enforces non-empty, but String doesn't complain about empty.
        refreshToken: null,
        tokenExpiresAt: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        action: 'workspace.revoked',
        resourceType: 'workspace',
        resourceId: workspace.id,
      },
    });
  }

  static async reconnectWorkspace(id: string, tenantId: string): Promise<{ url: string }> {
    const workspace = await this.getWorkspaceById(id, tenantId);
    const { url } = await this.initiateOAuth(tenantId, workspace.provider);
    return { url };
  }

  static async testConnection(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const { decryptedAccessToken, provider } = await this.getWorkspaceWithDecryptedToken(id, tenantId);

    try {
      if (provider === WorkspaceProvider.GOOGLE) {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: decryptedAccessToken });
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        await gmail.users.threads.list({ userId: 'me', maxResults: 1 });
      } else if (provider === WorkspaceProvider.SLACK) {
        const response = await fetch('https://slack.com/api/auth.test', {
          headers: {
            Authorization: `Bearer ${decryptedAccessToken}`,
          },
        });
        const data = await response.json();
        if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
      } else {
        throw new Error('Unsupported provider for test');
      }

      await prisma.workspace.update({
        where: { id },
        data: { lastSuccessfulCallAt: new Date() },
      });

      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      await prisma.workspace.update({
        where: { id },
        data: { status: WorkspaceStatus.ERROR },
      });
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  static async setDefaultWorkspace(id: string, tenantId: string): Promise<void> {
    await this.getWorkspaceById(id, tenantId); // ensure it exists

    await prisma.$transaction([
      prisma.workspace.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.workspace.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
  }

  static async renameWorkspace(id: string, tenantId: string, name: string): Promise<Workspace> {
    const workspace = await this.getWorkspaceById(id, tenantId); // ensure it exists
    return prisma.workspace.update({
      where: { id: workspace.id },
      data: { name },
    });
  }

  static async getWorkspaceWithDecryptedToken(
    id: string,
    tenantId: string
  ): Promise<Workspace & { decryptedAccessToken: string }> {
    const workspace = await this.getWorkspaceById(id, tenantId);

    if (!workspace.accessToken) {
      throw new Error('Workspace has no access token');
    }

    // Auto-refresh if expired
    if (workspace.tokenExpiresAt && workspace.tokenExpiresAt < new Date()) {
      if (workspace.provider === WorkspaceProvider.GOOGLE && workspace.refreshToken) {
        try {
          const decryptedRefreshToken = decrypt(workspace.refreshToken);
          const { accessToken, expiresAt } = await refreshGoogleToken(decryptedRefreshToken);

          await prisma.workspace.update({
            where: { id },
            data: {
              accessToken: encrypt(accessToken),
              tokenExpiresAt: expiresAt,
              status: WorkspaceStatus.ACTIVE,
            },
          });

          return { ...workspace, decryptedAccessToken: accessToken };
        } catch (err) {
          logger.error(`Token refresh failed for workspace ${id}`);
          await prisma.workspace.update({
            where: { id },
            data: { status: WorkspaceStatus.EXPIRED },
          });
          throw new Error('Workspace token expired and refresh failed. Please reconnect.');
        }
      }
      throw new Error('Workspace token expired. Please reconnect.');
    }

    const decryptedAccessToken = decrypt(workspace.accessToken);
    return { ...workspace, decryptedAccessToken };
  }
}
