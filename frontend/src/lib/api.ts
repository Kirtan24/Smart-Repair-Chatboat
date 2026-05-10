'use client';

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Interceptor to handle unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Use window.location instead of router to force a hard refresh
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Interceptor to add token to headers
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Auth ───────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => 
    api.post('/auth/register', { name, email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// ── Conversations ──────────────────────────────────────────────────────
export const conversationsApi = {
  list: () => api.get('/conversations'),
  get: (id: string) => api.get(`/conversations/${id}`),
  create: (data: any) => api.post('/conversations', data),
  update: (id: string, data: any) => 
    api.patch(`/conversations/${id}`, data),
  delete: (id: string) => api.delete(`/conversations/${id}`),
  editMessage: (convId: string, msgId: string, content: string) =>
    api.patch(`/conversations/${convId}/messages/${msgId}`, { content }),
};

// ── Chat ───────────────────────────────────────────────────────────────
export const chatApi = {
  sendMessage: (formData: FormData) =>
    api.post('/chat/send', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  regenerate: (conversation_id: string) =>
    api.post('/chat/regenerate', { conversation_id }),
  findTechnicians: (issue_type: string, location?: { lat: number; lng: number }) =>
    api.post('/chat/technicians', { issue_type, location }),
};

// ── Payments ────────────────────────────────────────────────────────────
export const paymentsApi = {
  getPlans: () => api.get('/payments/plans'),
  getMyPlan: () => api.get('/payments/my-plan'),
  createOrder: (planId: string, provider: string) =>
    api.post('/payments/create-order', { planId, provider }),
  verifyStripe: (sessionId: string, planId: string) =>
    api.post('/payments/verify-stripe', { session_id: sessionId, plan_id: planId }),
  verifyRazorpay: (data: any) => api.post('/payments/verify-razorpay', data),
};

// ── Admin ───────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => api.get('/admin/users/stats'),
  getUsers: () => api.get('/admin/users'),
  getPayments: () => api.get('/admin/payments'),
  getPlans: () => api.get('/admin/plans'),
  createPlan: (data: any) => api.post('/admin/plans', data),
};

export default api;
