'use client';

import { useState } from 'react';
import { conversationsApi } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';
import toast from 'react-hot-toast';

interface Props {
  messageId: string;
  conversationId: string;
  currentContent: string;
  onClose: () => void;
  onSaved: (newContent: string) => void;
}

export default function EditMessageModal({ messageId, conversationId, currentContent, onClose, onSaved }: Props) {
  const [content, setContent] = useState(currentContent);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim() || content.trim() === currentContent) { onClose(); return; }
    setSaving(true);
    try {
      await conversationsApi.editMessage(conversationId, messageId, content.trim());
      onSaved(content.trim());
      toast.success('Message updated');
      onClose();
    } catch {
      toast.error('Failed to update message');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <h3 className="modal-title">✏️ Edit Message</h3>
        <textarea
          className="modal-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSave();
          }}
        />
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
          Previous versions are saved for history. Press Ctrl+Enter to save.
        </p>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" style={{ borderTopColor: 'white' }} /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
