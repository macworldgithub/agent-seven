import api from '../lib/axios';
import { Workspace, Permission } from '../types';

export const workspaceService = {
  getWorkspaces: async () => {
    const res = await api.get('/workspaces');
    return res.data.data as Workspace[];
  },
  initiateGoogleOAuth: async () => {
    const res = await api.get('/workspaces/oauth/google/auth-url');
    window.location.href = res.data.data.url;
  },
  initiateSlackOAuth: async () => {
    const res = await api.get('/workspaces/oauth/slack/auth-url');
    window.location.href = res.data.data.url;
  },
  testConnection: async (id: string) => {
    const res = await api.post(`/workspaces/${id}/test`);
    return res.data;
  },
  revokeWorkspace: async (id: string) => {
    const res = await api.delete(`/workspaces/${id}`);
    return res.data;
  },
  reconnectWorkspace: async (id: string) => {
    const res = await api.post(`/workspaces/${id}/reconnect`);
    if (res.data.data?.url) {
      window.location.href = res.data.data.url;
    }
    return res.data;
  },
  updatePermissions: async (id: string, permissions: Partial<Permission>[]) => {
    const res = await api.patch(`/workspaces/${id}/permissions`, { permissions });
    return res.data.data as Workspace;
  },
  setDefault: async (id: string) => {
    const res = await api.patch(`/workspaces/${id}/default`);
    return res.data.data as Workspace;
  },
  rename: async (id: string, name: string) => {
    const res = await api.patch(`/workspaces/${id}`, { name });
    return res.data.data as Workspace;
  }
};
