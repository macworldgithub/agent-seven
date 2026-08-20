import api from '../lib/axios';
import { AdminOverview, AdminUser, AdminWorkspace, AuditLogItem, AdminUsage } from '../types';

export const adminService = {
  getOverview: async () => {
    const res = await api.get('/tenant/admin/overview');
    return res.data.data as AdminOverview;
  },
  getUsers: async () => {
    const res = await api.get('/tenant/admin/users');
    return res.data.data as AdminUser[];
  },
  createUser: async (data: { name: string; email: string; password?: string; isOrgAdmin?: boolean }) => {
    const res = await api.post('/tenant/admin/users', data);
    return res.data.data as AdminUser;
  },
  updateUserStatus: async (userId: string, updates: { isOrgAdmin?: boolean; isActive?: boolean }) => {
    const res = await api.patch(`/tenant/admin/users/${userId}`, updates);
    return res.data.data as AdminUser;
  },
  getWorkspaces: async () => {
    const res = await api.get('/tenant/admin/workspaces');
    return res.data.data as AdminWorkspace[];
  },
  getAuditLogs: async (page = 1, limit = 50, action?: string) => {
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    if (action) params.append('action', action);
    const res = await api.get(`/tenant/admin/audit-logs?${params.toString()}`);
    return res.data.data as {
      logs: AuditLogItem[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
  },
  getUsage: async () => {
    const res = await api.get('/tenant/admin/usage');
    return res.data.data as AdminUsage;
  },
};
