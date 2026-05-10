'use client';

import { create } from 'zustand';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoaded: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoaded: false,

  initialize: async () => {
    try {
      // First try to load basic info from localStorage for immediate UI feedback
      const localToken = localStorage.getItem('token');
      const localUser = localStorage.getItem('user');
      
      if (!localToken) {
        set({ isLoaded: true });
        return;
      }

      if (localUser) {
        set({ user: JSON.parse(localUser), token: localToken, isLoaded: true });
      }

      // Then verify with server
      const res = await authApi.me();
      if (res.data.user) {
        const user = {
          id: res.data.user._id,
          email: res.data.user.email,
          name: res.data.user.name,
          role: res.data.user.role,
          avatar_url: res.data.user.avatar_url
        };
        // Update storage with fresh data
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, isLoaded: true });
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isLoaded: true });
      }
    } catch (err: any) {
      // Only clear if it's a definite auth failure (401 or 403)
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isLoaded: true });
      } else {
        // Otherwise, keep the local data but stop loading
        set({ isLoaded: true });
      }
    }
  },

  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isLoaded: true });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
    window.location.href = '/login';
  },
}));
