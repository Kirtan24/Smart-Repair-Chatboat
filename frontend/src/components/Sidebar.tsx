'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, MessageSquare, LogOut, ChevronDown, MoreHorizontal, Snowflake, Droplet, Signal, Wind, Waves, Wrench, Flame, Tv, Radio } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useChatStore, type Conversation } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { conversationsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

const ISSUE_BADGE: Record<string, string> = {
  ac: 'badge-ac',
  refrigerator: 'badge-refrigerator',
  wifi: 'badge-wifi',
  fan: 'badge-fan',
  washing_machine: 'badge-general',
  general: 'badge-general',
};

const ISSUE_EMOJI: Record<string, string> = {
  ac: 'snowflake', refrigerator: 'droplet', wifi: 'signal',
  fan: 'wind', washing_machine: 'waves', general: 'wrench',
  water_heater: 'flame', tv: 'tv', microwave: 'radio',
};

// Map icon names to components
const getIssueIcon = (iconName: string) => {
  const iconMap: Record<string, React.FC<{ size?: number; strokeWidth?: number }>> = {
    snowflake: Snowflake,
    droplet: Droplet,
    signal: Signal,
    wind: Wind,
    waves: Waves,
    wrench: Wrench,
    flame: Flame,
    tv: Tv,
    radio: Radio,
  };
  const IconComponent = iconMap[iconName] || Wrench;
  return <IconComponent size={16} strokeWidth={1.5} />;
};

function groupByDate(convs: Conversation[]) {
  const groups: Record<string, Conversation[]> = {};
  convs.forEach((c) => {
    const d = new Date(c.updated_at);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMM d, yyyy');
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  return groups;
}

interface Props {
  onNewChat: () => void;
  onSelectConv: (id: string) => void;
}

export default function Sidebar({ onNewChat, onSelectConv }: Props) {
  const { conversations, activeConversationId, removeConversation } = useChatStore();
  const { user, logout } = useAuthStore();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [planData, setPlanData] = useState<any>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch user plan
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('http://localhost:5000/api/payments/my-plan', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.plan) setPlanData(data);
        }
      } catch (err) {
        console.error('Failed to fetch plan', err);
      }
    };
    fetchPlan();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenu(null);
    try {
      await conversationsApi.delete(id);
      removeConversation(id);
      toast.success('Conversation deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const groups = groupByDate(conversations);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"><Wrench size={24} strokeWidth={1.5} /></div>
          <div>
            <div className="sidebar-logo-text">Smart Repair</div>
            <div className="sidebar-logo-sub">AI Assistant</div>
          </div>
        </div>
      </div>

      {/* New Chat */}
      <button className="sidebar-new-chat" onClick={onNewChat} id="new-chat-btn">
        <Plus size={16} />
        New Repair Session
      </button>

      {/* Conversation list */}
      <div className="sidebar-conversations">
        {conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <MessageSquare size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ fontSize: '0.8rem' }}>No conversations yet</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Start a new repair session!</p>
          </div>
        ) : (
          Object.entries(groups).map(([date, convs], dateIndex) => (
            <div key={`${date}-${dateIndex}`}>
              <div className="sidebar-section-label">{date}</div>
              {convs.map((conv) => (
                <div
                  key={`conv-${conv.id}`}
                  className={`conv-item ${activeConversationId === conv.id ? 'active' : ''}`}
                  onClick={() => onSelectConv(conv.id)}
                  style={{ position: 'relative' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem' }}>
                    <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: '0.05rem' }}>
                      {getIssueIcon(ISSUE_EMOJI[conv.issue_type] ?? 'wrench')}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="conv-item-title">{conv.title}</div>
                      <div className="conv-item-meta">
                        <span className={`conv-item-badge ${ISSUE_BADGE[conv.issue_type] ?? 'badge-general'}`}>
                          {conv.issue_type?.replace('_', ' ') ?? 'general'}
                        </span>
                        {conv.message_count && (
                          <span>{conv.message_count} msg</span>
                        )}
                      </div>
                    </div>
                    {/* Menu button */}
                    <div ref={openMenu === conv.id ? menuRef : undefined} style={{ position: 'relative' }}>
                      <button
                        className="icon-btn"
                        style={{ width: '1.5rem', height: '1.5rem', opacity: 0.6 }}
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === conv.id ? null : conv.id); }}
                        title="Options"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {openMenu === conv.id && (
                        <div className="dropdown-menu">
                          <button
                            className="dropdown-item danger"
                            onClick={(e) => handleDelete(e, conv.id)}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Links */}
      <div style={{ padding: '0 1rem 1rem' }}>
        {planData ? (
          <div style={{ padding: '0.875rem', background: 'var(--orange-50)', borderRadius: 'var(--radius-lg)', marginBottom: user?.role === 'admin' ? '0.5rem' : 0, border: '1px solid var(--orange-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--orange-700)', textTransform: 'uppercase' }}>{planData.plan.name}</span>
              <Link href="/upgrade" style={{ fontSize: '0.7rem', color: 'var(--orange-600)', textDecoration: 'none', fontWeight: 600 }}>Manage</Link>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Queries Used: <strong style={{ color: 'var(--orange-600)' }}>{planData.chats_used} / {planData.plan.chat_limit}</strong>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--orange-200)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (planData.chats_used / planData.plan.chat_limit) * 100)}%`, height: '100%', background: 'var(--orange-500)', borderRadius: '2px', transition: 'width 0.5s ease-out' }} />
            </div>
          </div>
        ) : (
          <Link href="/upgrade" style={{ display: 'block', padding: '0.75rem', background: 'linear-gradient(135deg, var(--orange-500), var(--orange-600))', color: 'white', textDecoration: 'none', borderRadius: 'var(--radius-lg)', textAlign: 'center', fontWeight: 'bold', fontSize: '0.875rem', marginBottom: user?.role === 'admin' ? '0.5rem' : 0, boxShadow: 'var(--shadow-orange)' }}>
            Upgrade to Premium
          </Link>
        )}
        {user?.role === 'admin' && (
          <Link href="/admin" style={{ display: 'block', padding: '0.75rem', background: 'var(--gray-200)', color: 'var(--gray-800)', textDecoration: 'none', borderRadius: 'var(--radius-lg)', textAlign: 'center', fontWeight: 'bold', fontSize: '0.875rem' }}>
            Admin Dashboard
          </Link>
        )}
      </div>

      {/* User info */}
      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.name?.charAt(0).toUpperCase() ?? 'U'}
        </div>
        <div className="user-info">
          <div className="user-name">{user?.name}</div>
          <div className="user-email">{user?.email}</div>
        </div>
        <button
          className="icon-btn"
          onClick={handleLogout}
          title="Sign out"
          style={{ color: 'var(--text-muted)', flexShrink: 0 }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
