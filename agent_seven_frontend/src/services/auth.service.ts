import api from '../lib/axios';
import { AuthResponse } from '../types';

export const authService = {
  register: async (data: any) => {
    const res = await api.post('/auth/register', data);
    return res.data.data as AuthResponse;
  },
  login: async (data: any) => {
    const res = await api.post('/auth/login', data);
    return res.data.data as AuthResponse;
  },
  logout: async () => {
    await api.post('/auth/logout');
  },
  refreshToken: async () => {
    const res = await api.post('/auth/refresh');
    return res.data.data as AuthResponse;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data.data as AuthResponse;
  },
};
