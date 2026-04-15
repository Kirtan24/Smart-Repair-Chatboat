'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, MessageSquare, LogOut, ChevronDown, MoreHorizontal, Snowflake, Droplet, Signal, Wind, Waves, Wrench, Flame, Tv, Radio } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useChatStore, type Conversation } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { conversationsApi } from '@/lib/api';
import toast from 'react-hot-toast';

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
  const iconMap: Record<string, React.FC> = {
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
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
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
