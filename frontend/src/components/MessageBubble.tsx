'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { Edit2, RefreshCw, Copy, Check, Wrench } from 'lucide-react';
import TechnicianCards from './TechnicianCards';
import type { Message } from '@/store/chatStore';

interface Props {
  message: Message;
  userInitial: string;
  onEdit?: (msg: Message) => void;
  onRegenerate?: () => void;
  isLast?: boolean;
}

export default function MessageBubble({ message, userInitial, onEdit, onRegenerate, isLast }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const technicians = message.metadata?.technicians ?? [];
  const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const time = (() => {
    try { return format(new Date(message.created_at), 'h:mm a'); }
    catch { return ''; }
  })();

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? 'user-avatar-msg' : 'assistant-avatar'}`}>
        {isUser ? userInitial : <Wrench size={20} strokeWidth={1.5} />}
      </div>

      <div className="message-content">
        {/* Image preview */}
        {message.image_url && (
          <div className="message-image">
            <img
              src={`${API_URL}${message.image_url}`}
              alt="Uploaded"
              style={{ maxHeight: '200px', width: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Bubble */}
        <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
          {isUser ? (
            <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          )}

          {/* Technician cards inside assistant bubble */}
          {!isUser && technicians.length > 0 && (
            <TechnicianCards technicians={technicians} />
          )}
        </div>

        {/* Timestamp + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.375rem' }}>
          <span className="message-time">{time}</span>
          {message.version && message.version > 1 && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              (edited v{message.version})
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="message-actions">
          {isUser && onEdit && (
            <button className="message-action-btn" onClick={() => onEdit(message)} title="Edit message">
              <Edit2 size={11} /> Edit
            </button>
          )}
          {!isUser && (
            <>
              <button className="message-action-btn" onClick={handleCopy} title="Copy">
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {isLast && onRegenerate && (
                <button className="message-action-btn" onClick={onRegenerate} title="Regenerate">
                  <RefreshCw size={11} /> Regenerate
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
