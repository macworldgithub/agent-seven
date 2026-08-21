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
};
