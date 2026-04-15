'use client';

import { create } from 'zustand';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  input_type?: string;
  image_url?: string;
  metadata?: {
    technicians?: Technician[];
    needsPro?: boolean;
    provider?: string;
  };
  version?: number;
  created_at: string;
}

export interface Technician {
  id: string;
  name: string;
  rating: number | null;
  reviewCount: number;
  distance: number | null;
  phone: string | null;
  address: string;
  specializations: string[];
  available: boolean | null;
  responseTime: string;
  priceRange: string;
  photo?: string | null;
  isMock?: boolean;
  mapsLink?: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  issue_type: string;
  status: string;
  resolution_status: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  message_count?: number;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  isSending: boolean;

  setConversations: (convs: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  removeConversation: (id: string) => void;
  /** Switch to a different conversation and clear messages (for sidebar navigation). */
  setActiveConversation: (id: string | null) => void;
  /** Set the active conversation ID only — does NOT clear messages (used after first send). */
  setActiveConversationId: (id: string) => void;
  setMessages: (msgs: Message[]) => void;
  addMessage: (msg: Message) => void;
  replaceLastAssistantMessage: (msg: Message) => void;
  updateMessage: (id: string, content: string) => void;
  setLoading: (v: boolean) => void;
  setSending: (v: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,
  isSending: false,

  setConversations: (conversations) => set({ conversations }),
  addConversation: (conv) =>
    set((s) => ({ conversations: [conv, ...s.conversations] })),
  removeConversation: (id) =>
    set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) })),
  setActiveConversation: (id) => set({ activeConversationId: id, messages: [] }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  replaceLastAssistantMessage: (msg) =>
    set((s) => {
      const msgs = [...s.messages];
      const lastIdx = [...msgs].reverse().findIndex((m) => m.role === 'assistant');
      if (lastIdx !== -1) msgs[msgs.length - 1 - lastIdx] = msg;
      else msgs.push(msg);
      return { messages: msgs };
    }),
  updateMessage: (id, content) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setSending: (isSending) => set({ isSending }),
}));
