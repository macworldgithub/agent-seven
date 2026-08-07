import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Tenant, Agent, AuthResponse } from '../types';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  agent: Agent | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (data: AuthResponse) => void;
  clearAuth: () => void;
  updateAgent: (agent: Agent) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      agent: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (data) =>
        set({
          user: data.user,
          tenant: data.tenant,
          agent: data.agent,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        }),
      clearAuth: () =>
        set({
          user: null,
          tenant: null,
          agent: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
      updateAgent: (agent) =>
        set({
          agent,
        }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
