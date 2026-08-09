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
