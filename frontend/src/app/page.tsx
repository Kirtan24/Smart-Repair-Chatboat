'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { RefreshCw, Wrench, Mic, Image as ImageIcon, Snowflake, Wind, Waves, Signal, Droplet } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import ChatInput from '@/components/ChatInput';
import MessageBubble from '@/components/MessageBubble';
import EditMessageModal from '@/components/EditMessageModal';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import { useAuthStore } from '@/store/authStore';
import { useChatStore, type Message } from '@/store/chatStore';
import { chatApi, conversationsApi } from '@/lib/api';

const QUICK_ACTIONS = [
  { icon: Snowflake, title: 'AC Problem',         desc: 'Not cooling, leaking, noise',   prompt: 'My AC is not cooling properly and it seems to be leaking water' },
  { icon: Droplet, title: 'Fridge Issue',        desc: 'Not cold, making noise',         prompt: 'My refrigerator is not maintaining the right temperature' },
  { icon: Signal, title: 'WiFi Down',           desc: 'No internet, slow speed',        prompt: 'My WiFi is not working and I have no internet connection' },
  { icon: Wind, title: 'Fan Not Working',     desc: "Won't start, noisy, slow",       prompt: 'My ceiling fan is not turning on at all' },
  { icon: Waves, title: 'Washing Machine',     desc: 'Not draining or spinning',       prompt: "My washing machine won't drain water after the wash cycle" },
  { icon: ImageIcon, title: 'Water Heater',        desc: 'No hot water, leaking',          prompt: 'My water heater is not producing hot water' },
];

export default function ChatPage() {
  const router = useRouter();
  const { user, isLoaded, loadFromStorage } = useAuthStore();
  const {
    conversations, activeConversationId, messages, isSending,
    setConversations, setActiveConversation, setActiveConversationId, setMessages, addMessage,
    replaceLastAssistantMessage, updateMessage, setSending,
  } = useChatStore();

  const [editingMsg, setEditingMsg]       = useState<Message | null>(null);
  const [isLoadingConv, setIsLoadingConv] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const chatInputRef    = useRef<HTMLTextAreaElement>(null);
  // Keep a live ref to messages to avoid stale closures
  const messagesRef = useRef(messages);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => { loadFromStorage(); }, []);
  useEffect(() => {
    if (isLoaded && !user) router.push('/login');
  }, [isLoaded, user]);

  // ── Load sidebar conversations ──────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    conversationsApi.list()
      .then((r) => setConversations(r.data.conversations))
      .catch(() => {});
  }, [user]);

  // ── Auto-scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // ── Global keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift+Esc: Focus chat input
      if (e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        chatInputRef.current?.focus();
        return;
      }

      // ?: Show shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcuts(true);
        return;
      }

      // Esc: Close shortcuts or modal
      if (e.key === 'Escape' && showShortcuts) {
        e.preventDefault();
        setShowShortcuts(false);
        return;
      }

      // Ctrl/Cmd+N: New conversation
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts]);

  // ── Select conversation ─────────────────────────────────────────────────
  const handleSelectConv = useCallback(async (id: string) => {
    if (id === activeConversationId) return;
    setActiveConversation(id);
    setIsLoadingConv(true);
    try {
      const r = await conversationsApi.get(id);
      setMessages(r.data.messages);
    } catch {
      toast.error('Failed to load conversation');
    } finally {
      setIsLoadingConv(false);
    }
  }, [activeConversationId]);

  // ── New chat ────────────────────────────────────────────────────────────
  const handleNewChat = () => {
    setActiveConversation(null);
    setMessages([]);
  };

  // ── Send message ────────────────────────────────────────────────────────
  const handleSend = useCallback(async (
    content: string,
    image?: File,
    audioBlob?: Blob,
    audioMime?: string,
  ) => {
    if (isSending) return;
    setSending(true);

    const tempId    = `temp-${Date.now()}`;
    const typingId  = `typing-${Date.now() + 1}`;

    // Optimistic user message
    const userMsg: Message = {
      id: tempId,
      role: 'user',
      content: content || (image ? '[Image uploaded]' : '[Voice message]'),
      image_url: image ? URL.createObjectURL(image) : undefined,
      input_type: audioBlob ? 'voice' : image ? 'image' : 'text',
      created_at: new Date().toISOString(),
    };
    addMessage(userMsg);

    // Typing indicator
    addMessage({
      id: typingId,
      role: 'assistant',
      content: '__typing__',
      created_at: new Date().toISOString(),
    });

    try {
      const fd = new FormData();
      if (content) fd.append('content', content);

      const convId = activeConversationId;
      if (convId) fd.append('conversation_id', convId);

      // Try geolocation (non-blocking)
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
        );
        fd.append('location', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
      } catch { /* ignore – not required */ }

      if (image) {
        fd.append('image', image);
        fd.append('input_type', 'image');
      } else if (audioBlob) {
        const ext = audioMime?.includes('webm') ? 'webm' : 'ogg';
        fd.append('audio', new File([audioBlob], `voice.${ext}`, { type: audioMime ?? 'audio/webm' }));
        fd.append('input_type', 'voice');
      } else {
        fd.append('input_type', 'text');
      }

      const r = await chatApi.sendMessage(fd);
      const { conversation_id, user_message, assistant_message } = r.data;

      // Replace optimistic + typing with real messages
      const prev = messagesRef.current.filter((m) => m.id !== tempId && m.id !== typingId);
      setMessages([
        ...prev,
        { ...user_message, image_url: user_message.image_url || userMsg.image_url },
        assistant_message,
      ]);

      // Update sidebar
      if (!convId) {
        // Use setActiveConversationId (not setActiveConversation) to avoid clearing messages
        setActiveConversationId(conversation_id);
      }
      conversationsApi.list().then((resp) => setConversations(resp.data.conversations));
    } catch (err: any) {
      setMessages(messagesRef.current.filter((m) => m.id !== tempId && m.id !== typingId));
      toast.error(err.response?.data?.error || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  }, [isSending, activeConversationId]);

  // ── Regenerate ──────────────────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (!activeConversationId || isSending) return;
    setSending(true);
    try {
      const r = await chatApi.regenerate(activeConversationId);
      replaceLastAssistantMessage(r.data.message);
      toast.success('Response regenerated');
    } catch {
      toast.error('Failed to regenerate');
    } finally {
      setSending(false);
    }
  }, [activeConversationId, isSending]);

  // ── Edit saved ──────────────────────────────────────────────────────────
  const handleEditSaved = (newContent: string) => {
    if (!editingMsg) return;
    updateMessage(editingMsg.id, newContent);
    setEditingMsg(null);
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (!isLoaded || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
            <Wrench size={64} strokeWidth={1.5} style={{ display: 'inline', color: 'var(--orange-500)' }} />
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading Smart Repair Assistant…</div>
        </div>
      </div>
    );
  }

  const userInitial    = user.name?.charAt(0).toUpperCase() ?? 'U';
  const displayMsgs    = messages.filter((m) => m.content !== '__typing__');
  const isTyping       = messages.some((m) => m.content === '__typing__');
  const showWelcome    = !activeConversationId && displayMsgs.length === 0;

  return (
    <>
      {/* Edit message modal */}
      {editingMsg && activeConversationId && (
        <EditMessageModal
          messageId={editingMsg.id}
          conversationId={activeConversationId}
          currentContent={editingMsg.content}
          onClose={() => setEditingMsg(null)}
          onSaved={handleEditSaved}
        />
      )}

      <div className="app-layout">
        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <Sidebar onNewChat={handleNewChat} onSelectConv={handleSelectConv} />

        {/* ── Main chat area ────────────────────────────────────────────── */}
        <main className="chat-main">

          {/* Header */}
          <div className="chat-header">
            <div style={{ width: '2.25rem', height: '2.25rem', background: 'linear-gradient(135deg, var(--orange-500), var(--orange-600))', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, boxShadow: '0 2px 8px rgba(249, 115, 22, 0.15)' }}>
              <Wrench size={20} strokeWidth={1.5} />
            </div>
            <div className="chat-header-title">
              <h2>{activeConv?.title ?? 'Smart Repair Assistant'}</h2>
              {activeConv && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
                  <span className="chat-header-badge">
                    {activeConv.issue_type?.replace(/_/g, ' ')} &middot; {activeConv.resolution_status?.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
            {isSending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: 'var(--orange-600)', flexShrink: 0 }}>
                <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                AI thinking…
              </div>
            )}
          </div>

          {/* Welcome or messages */}
          {showWelcome ? (
            <div className="messages-area">
              <div className="welcome-screen">
                <div className="welcome-icon">
                  <Wrench size={56} strokeWidth={1.5} />
                </div>
                <h1 className="welcome-title">Smart Repair Assistant</h1>
                <p className="welcome-subtitle">
                  Your AI-powered home technician. Describe any appliance issue via text, <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>voice <Mic size={14} strokeWidth={1.5} /></span>, or <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>photo <ImageIcon size={14} strokeWidth={1.5} /></span> — I'll diagnose it step-by-step and guide you to the fix or the right technician.
                </p>
                <div className="quick-actions">
                  {QUICK_ACTIONS.map((qa) => {
                    const IconComponent = qa.icon;
                    return (
                      <button
                        key={qa.title}
                        className="quick-action-btn"
                        onClick={() => handleSend(qa.prompt)}
                        id={`quick-action-${qa.title.toLowerCase().replace(/\s+/g, '-')}`}
                        disabled={isSending}
                      >
                        <span className="quick-action-icon">
                          <IconComponent size={24} strokeWidth={1.5} />
                        </span>
                        <span className="quick-action-text">
                          <span className="quick-action-title">{qa.title}</span>
                          <span className="quick-action-desc">{qa.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="messages-area" id="messages-scroll-area">
              {isLoadingConv ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ fontSize: '0.875rem' }}>Loading conversation…</span>
                </div>
              ) : (
                <>
                  {displayMsgs.map((msg, idx) => {
                    const isLast = idx === displayMsgs.length - 1 && msg.role === 'assistant';
                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
                        userInitial={userInitial}
                        onEdit={msg.role === 'user' ? setEditingMsg : undefined}
                        onRegenerate={isLast ? handleRegenerate : undefined}
                        isLast={isLast}
                      />
                    );
                  })}

                  {/* Typing dots */}
                  {isTyping && (
                    <div className="typing-indicator">
                      <div className="message-avatar assistant-avatar">
                        <Wrench size={20} strokeWidth={1.5} />
                      </div>
                      <div className="typing-dots">
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                        <div className="typing-dot" />
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Chat input */}
          <ChatInput 
            ref={chatInputRef}
            onSend={handleSend} 
            disabled={isSending}
            onShowShortcuts={() => setShowShortcuts(true)}
          />
        </main>

        {/* Keyboard shortcuts modal */}
        <KeyboardShortcuts isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </div>
    </>
  );
}
