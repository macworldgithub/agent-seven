import api from '../lib/axios';

export interface Briefing {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  preview: string;
}

export interface BriefingStatus {
  hasRunToday: boolean;
  lastRanAt: string | null;
  nextScheduledAt: string;
  isEnabled: boolean;
  configuredTime: string;
  timezone: string;
}

export const briefingService = {
  async getLatestBriefing(): Promise<Briefing | null> {
    const res = await api.get('/briefing/latest');
    return res.data.data ?? null;
  },

  async getBriefingHistory(limit = 30): Promise<Briefing[]> {
    const res = await api.get(`/briefing/history?limit=${limit}`);
    return res.data.data ?? [];
  },

  async getBriefingById(id: string): Promise<Briefing> {
    const res = await api.get(`/briefing/${id}`);
    return res.data.data;
  },

  async getBriefingStatus(): Promise<BriefingStatus> {
    const res = await api.get('/briefing/status');
    return res.data.data;
  },

  async triggerBriefing(): Promise<{ message: string }> {
    const res = await api.post('/briefing/trigger');
    return res.data.data;
  },
};
