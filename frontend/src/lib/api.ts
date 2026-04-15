import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 60000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ───────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
};

// ── Conversations ──────────────────────────────────────────────────────
export const conversationsApi = {
  list: async () => {
    const res = await api.get('/conversations');
    // Normalize MongoDB's _id to id
    if (res.data.conversations) {
      res.data.conversations = res.data.conversations.map((conv: any) => ({
        ...conv,
        id: conv._id,
      }));
    }
    return res;
  },
  get: async (id: string) => {
    const res = await api.get(`/conversations/${id}`);
    // Normalize MongoDB's _id to id
    if (res.data.conversation) {
      res.data.conversation = {
        ...res.data.conversation,
        id: res.data.conversation._id,
      };
    }
    return res;
  },
  create: (title?: string, issue_type?: string) =>
    api.post('/conversations', { title, issue_type }),
  update: (id: string, data: Record<string, string>) =>
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

export default api;
