import api from '../lib/axios';

export interface DriveFile {
  fileId: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
  content?: string;
}

export interface GeneratedDocument {
  documentId: string;
  title: string;
  webViewLink: string;
}

export const driveService = {
  /**
   * List files in a workspace, optionally inside a folder or filtered by type.
   */
  getFiles: async (
    workspaceId: string,
    options?: { folderId?: string; mimeType?: string; query?: string; maxResults?: number }
  ): Promise<DriveFile[]> => {
    const params = new URLSearchParams({ workspaceId });
    if (options?.folderId) params.set('folderId', options.folderId);
    if (options?.mimeType) params.set('mimeType', options.mimeType);
    if (options?.query) params.set('query', options.query);
    if (options?.maxResults) params.set('maxResults', String(options.maxResults));

    const res = await api.get(`/drive/files?${params.toString()}`);
    return res.data.data as DriveFile[];
  },

  /**
   * Full-text search across Drive.
   */
  searchFiles: async (workspaceId: string, query: string, maxResults?: number): Promise<DriveFile[]> => {
    const params = new URLSearchParams({ workspaceId, q: query });
    if (maxResults) params.set('maxResults', String(maxResults));

    const res = await api.get(`/drive/search?${params.toString()}`);
    return res.data.data as DriveFile[];
  },

  /**
   * Get file metadata and optionally content.
   */
  getFileContent: async (workspaceId: string, fileId: string): Promise<DriveFile> => {
    const params = new URLSearchParams({ workspaceId, includeContent: 'true' });
    const res = await api.get(`/drive/files/${fileId}?${params.toString()}`);
    return res.data.data as DriveFile;
  },

  /**
   * Create a blank Google Doc.
   */
  createDocument: async (workspaceId: string, title: string, content: string): Promise<GeneratedDocument> => {
    const res = await api.post('/drive/documents', { workspaceId, title, content });
    return res.data.data as GeneratedDocument;
  },

  /**
   * Generate a branded document (proposal, invoice, meeting_notes, report, sow).
   */
  generateDocument: async (
    workspaceId: string,
    type: string,
    title: string,
    data: Record<string, any>,
    brandConfig?: { companyName?: string }
  ): Promise<GeneratedDocument> => {
    const res = await api.post('/drive/generate', { workspaceId, type, title, data, brandConfig });
    return res.data.data as GeneratedDocument;
  },
};
