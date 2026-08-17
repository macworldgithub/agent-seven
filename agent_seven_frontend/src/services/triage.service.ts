import api from '../lib/axios';

export interface ClassifiedEmail {
  id: string;
  tenantId: string;
  workspaceId: string;
  messageId: string;
  threadId: string;
  subject: string;
  from: string;
  snippet: string | null;
  priority: 'URGENT' | 'IMPORTANT' | 'NORMAL' | 'LOW' | 'SPAM';
  intent: 'ACTION_REQUIRED' | 'QUESTION' | 'MEETING_REQUEST' | 'FOLLOW_UP' | 'FYI' | 'NEWSLETTER' | 'SPAM';
  score: number;
  requiresReply: boolean;
  hasDeadline: boolean;
  deadlineText: string | null;
  sentiment: string | null;
  summary: string | null;
  suggestedReply: string | null;
  isRead: boolean;
  isArchived: boolean;
  isActedOn: boolean;
  classifiedAt: string;
  emailDate: string | null;
}

export interface TriageSummary {
  urgent: number;
  important: number;
  normal: number;
  low: number;
  spam: number;
  requiresReply: number;
  unacted: number;
}

export interface TriageFilters {
  priority?: string;
  intent?: string;
  requiresReply?: boolean;
  isActedOn?: boolean;
  workspaceId?: string;
  limit?: number;
  offset?: number;
}

export interface WatchlistItem {
  id: string;
  tenantId: string;
  agentId: string;
  type: 'EMAIL_ADDRESS' | 'EMAIL_DOMAIN' | 'KEYWORD' | 'SLACK_USER' | 'SLACK_KEYWORD';
  value: string;
  label: string | null;
  description: string | null;
  notifyOnEmail: boolean;
  notifyOnSlack: boolean;
  alertLevel: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  isActive: boolean;
  lastMatchAt: string | null;
  matchCount: number;
  createdAt: string;
}

export interface WatchlistMatch {
  id: string;
  tenantId: string;
  watchlistItemId: string;
  source: string;
  sourceId: string;
  matchedValue: string;
  context: string | null;
  isRead: boolean;
  createdAt: string;
  watchlistItem?: WatchlistItem;
}

export type WatchlistItemInput = Partial<Omit<WatchlistItem, 'id' | 'tenantId' | 'agentId' | 'isActive' | 'lastMatchAt' | 'matchCount' | 'createdAt'>>;

export const triageService = {
  // Email Triage
  getEmails: async (filters?: TriageFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, value.toString());
      });
    }
    // Cache-bust to always get fresh results
    params.append('_t', Date.now().toString());
    const response = await api.get<{ success: boolean; data: { emails: ClassifiedEmail[], total: number } }>(`/triage/emails?${params.toString()}`);
    return response.data.data;
  },

  getTriageSummary: async (workspaceId?: string) => {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspaceId', workspaceId);
    // Cache-bust to always get fresh results
    params.append('_t', Date.now().toString());
    const response = await api.get<{ success: boolean; data: TriageSummary }>(`/triage/summary?${params.toString()}`);
    return response.data.data;
  },

  triggerTriage: async () => {
    const response = await api.post<{ success: boolean; data?: { message: string; workspacesCount: number } }>('/triage/trigger');
    return response.data;
  },

  markActedOn: async (id: string) => {
    await api.patch(`/triage/${id}/acted`);
  },

  generateReplyDraft: async (id: string) => {
    const response = await api.post<{ success: boolean; data: { reply: string } }>(`/triage/${id}/draft-reply`);
    return response.data.data.reply;
  },

  // Watchlist
  getWatchlistItems: async () => {
    const response = await api.get<{ success: boolean; data: WatchlistItem[] }>('/triage/watchlist');
    return response.data.data;
  },

  addWatchlistItem: async (data: WatchlistItemInput) => {
    const response = await api.post<{ success: boolean; data: WatchlistItem }>('/triage/watchlist', data);
    return response.data.data;
  },

  updateWatchlistItem: async (id: string, data: Partial<WatchlistItemInput>) => {
    const response = await api.patch<{ success: boolean; data: WatchlistItem }>(`/triage/watchlist/${id}`, data);
    return response.data.data;
  },

  deleteWatchlistItem: async (id: string) => {
    await api.delete(`/triage/watchlist/${id}`);
  },

  toggleWatchlistItem: async (id: string) => {
    const response = await api.patch<{ success: boolean; data: WatchlistItem }>(`/triage/watchlist/${id}/toggle`);
    return response.data.data;
  },

  // Alerts
  getAlerts: async (unreadOnly?: boolean) => {
    const params = unreadOnly !== undefined ? `?unreadOnly=${unreadOnly}` : '';
    const response = await api.get<{ success: boolean; data: WatchlistMatch[] }>(`/triage/alerts${params}`);
    return response.data.data;
  },

  markAlertRead: async (id: string) => {
    await api.patch(`/triage/alerts/${id}/read`);
  },

  markAllAlertsRead: async () => {
    await api.patch('/triage/alerts/read-all');
  },

  getUnreadAlertCount: async () => {
    const response = await api.get<{ success: boolean; data: { count: number } }>('/triage/alerts/count');
    return response.data.data.count;
  }
};
