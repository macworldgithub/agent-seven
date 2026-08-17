import api from '../lib/axios';
import { Agent, Conversation, Message, Plan, Subscription, Usage } from '../types';

export const agentService = {
  getAgent: async () => {
    const res = await api.get('/agent');
    return res.data.data as Agent;
  },
  updateConfig: async (data: Partial<Agent>) => {
    const res = await api.patch('/agent/config', data);
    return res.data.data as Agent;
  },
  sendMessage: async (message: string, conversationId?: string) => {
    const res = await api.post('/agent/chat', { message, conversationId });
    return res.data.data;
  },
  /**
   * Send a message with an optional image attachment via multipart/form-data.
   * Posts to /agent/chat/vision which runs GPT-4o vision before the agent loop.
   */
  sendMessageWithImage: async (message: string, conversationId?: string, imageBlob?: Blob, mimeType?: string) => {
    const formData = new FormData();
    formData.append('message', message);
    if (conversationId) formData.append('conversationId', conversationId);
    if (imageBlob) {
      const extension = (mimeType || 'image/jpeg').split('/')[1] || 'jpg';
      formData.append('image', imageBlob, `upload.${extension}`);
    }

    // Use fetch directly since axios can interfere with FormData Content-Type boundaries
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || '';
    const baseUrl = (api.defaults.baseURL || '').replace(/\/$/, '');

    const response = await fetch(`${baseUrl}/agent/chat/vision`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(err.error || 'Vision chat request failed');
    }

    const data = await response.json();
    return data.data;
  },
  getConversations: async () => {
    const res = await api.get('/agent/conversations');
    return res.data.data as Conversation[];
  },
  getMessages: async (conversationId: string) => {
    const res = await api.get(`/agent/conversations/${conversationId}/messages`);
    return res.data.data as Message[];
  },
  deleteConversation: async (id: string) => {
    await api.delete(`/agent/conversations/${id}`);
  },
  getPlans: async () => {
    const res = await api.get('/billing/plans');
    return res.data.data as Plan[];
  },
  getSubscription: async () => {
    const res = await api.get('/billing/subscription');
    return res.data.data as Subscription;
  },
  getUsage: async () => {
    const res = await api.get('/billing/usage');
    return res.data.data as Usage;
  },
  createCheckout: async (plan: string) => {
    const res = await api.post('/billing/checkout', { plan });
    return res.data.data as { url: string };
  },
  createPortal: async () => {
    const res = await api.post('/billing/portal');
    return res.data.data as { url: string };
  }
};

