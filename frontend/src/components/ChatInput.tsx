'use client';

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Mic, X, Image, HelpCircle } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

interface Props {
  onSend: (content: string, image?: File, audioBlob?: Blob, audioMime?: string) => void;
  disabled?: boolean;
  onShowShortcuts?: () => void;
}

export default forwardRef<HTMLTextAreaElement, Props>(function ChatInput(
  { onSend, disabled, onShowShortcuts },
  ref
) {
  const [text, setText]               = useState('');
  const [image, setImage]             = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showVoice, setShowVoice]     = useState(false);
  const [isDragging, setIsDragging]   = useState(false);

  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => textareaRef.current as HTMLTextAreaElement);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const applyImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 20 * 1024 * 1024) {
      alert('Image must be under 20MB');
      return;
    }
    setImage(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSend = () => {
    if ((!text.trim() && !image) || disabled) return;
    onSend(text.trim(), image ?? undefined);
    setText('');
    setImage(null);
    setImagePreview(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Paste: Ctrl+V image ────────────────────────────────────────────────────
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find((i) => i.type.startsWith('image/'));
    if (!imgItem) return;
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (file) applyImageFile(file);
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only fire when leaving the outer container (not child elements)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) applyImageFile(file);
  };

  // ── File picker ────────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyImageFile(file);
    e.target.value = '';
  };

  const handleVoiceTranscript = (blob: Blob, mimeType: string) => {
    setShowVoice(false);
    onSend('', undefined, blob, mimeType);
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const canSend = (text.trim().length > 0 || !!image) && !disabled;

  return (
    <>
      {showVoice && (
        <VoiceRecorder
          onTranscript={handleVoiceTranscript}
          onClose={() => setShowVoice(false)}
        />
      )}

      <div
        className={`chat-input-area${isDragging ? ' drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay hint */}
        {isDragging && (
          <div className="drag-overlay">
            <Image size={28} />
            <span>Drop image here</span>
          </div>
        )}

        {/* Image preview */}
        {imagePreview && image && (
          <div className="image-preview-bar">
            <img src={imagePreview} alt="preview" className="image-preview-thumb" />
            <span className="image-preview-name">{image.name || 'Pasted image'}</span>
            <button className="image-preview-remove" onClick={removeImage} title="Remove image">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="input-row">
          {/* Image upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleImageSelect}
            id="image-upload-input"
          />
          <button
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload image"
            disabled={disabled}
            type="button"
          >
            <Image size={18} />
          </button>

          {/* Text area — handles paste */}
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Describe your appliance issue… or paste / drop an image"
            rows={1}
            disabled={disabled}
            id="chat-message-input"
          />

          <div className="input-actions">
            <button
              className="icon-btn"
              onClick={() => onShowShortcuts?.()}
              title="Show shortcuts"
              disabled={disabled}
              type="button"
            >
              <HelpCircle size={18} />
            </button>

            <button
              className="icon-btn"
              onClick={() => setShowVoice(true)}
              title="Voice input"
              disabled={disabled}
              type="button"
              id="voice-input-btn"
            >
              <Mic size={18} />
            </button>

            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!canSend}
              title="Send message (Enter)"
              type="button"
              id="send-message-btn"
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        <p className="input-hint">
          <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for new line · <strong>Ctrl+V</strong> to paste image · drag &amp; drop image
        </p>
      </div>
    </>
  );
});
