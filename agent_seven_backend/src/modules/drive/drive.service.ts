import { WorkspaceService } from '../workspace/workspace.service';
import {
  driveListFiles,
  driveGetFile,
  driveCreateFolder,
  driveUploadFile,
  driveSearchFiles,
  docsCreateDocument,
  docsUpdateDocument,
  generateBrandedDocument,
} from '../../services/tools/drive.tools';

export const driveModuleService = {
  async listFiles(
    workspaceId: string,
    tenantId: string,
    options: { folderId?: string; mimeType?: string; query?: string; maxResults?: number }
  ) {
    const { decryptedAccessToken } = await WorkspaceService.getWorkspaceWithDecryptedToken(workspaceId, tenantId);
    return driveListFiles(decryptedAccessToken, options);
  },

  async searchFiles(workspaceId: string, tenantId: string, query: string, maxResults?: number) {
    const { decryptedAccessToken } = await WorkspaceService.getWorkspaceWithDecryptedToken(workspaceId, tenantId);
    return driveSearchFiles(decryptedAccessToken, { query, maxResults });
  },

  async getFile(workspaceId: string, tenantId: string, fileId: string, includeContent?: boolean) {
    const { decryptedAccessToken } = await WorkspaceService.getWorkspaceWithDecryptedToken(workspaceId, tenantId);
    return driveGetFile(decryptedAccessToken, { fileId, includeContent });
  },

  async createFolder(workspaceId: string, tenantId: string, name: string, parentFolderId?: string) {
    const { decryptedAccessToken } = await WorkspaceService.getWorkspaceWithDecryptedToken(workspaceId, tenantId);
    return driveCreateFolder(decryptedAccessToken, { name, parentFolderId });
  },

  async uploadFile(
    workspaceId: string,
    tenantId: string,
    input: { name: string; content: string; mimeType?: string; parentFolderId?: string }
  ) {
    const { decryptedAccessToken } = await WorkspaceService.getWorkspaceWithDecryptedToken(workspaceId, tenantId);
    return driveUploadFile(decryptedAccessToken, { ...input, mimeType: input.mimeType || 'text/plain' });
  },

  async createDocument(workspaceId: string, tenantId: string, title: string, content: string) {
    const { decryptedAccessToken } = await WorkspaceService.getWorkspaceWithDecryptedToken(workspaceId, tenantId);
    return docsCreateDocument(decryptedAccessToken, { title, content });
  },

  async updateDocument(
    workspaceId: string,
    tenantId: string,
    documentId: string,
    content: string,
    append?: boolean
  ) {
    const { decryptedAccessToken } = await WorkspaceService.getWorkspaceWithDecryptedToken(workspaceId, tenantId);
    return docsUpdateDocument(decryptedAccessToken, { documentId, content, append });
  },

  async generateDocument(
    workspaceId: string,
    tenantId: string,
    type: string,
    title: string,
    data: Record<string, any>,
    brandConfig?: { companyName?: string }
  ) {
    const { decryptedAccessToken } = await WorkspaceService.getWorkspaceWithDecryptedToken(workspaceId, tenantId);
    return generateBrandedDocument(decryptedAccessToken, { type: type as any, title, data, brandConfig });
  },
};
