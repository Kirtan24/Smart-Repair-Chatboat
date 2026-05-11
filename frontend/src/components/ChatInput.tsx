'use client';

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Mic, X, Image, HelpCircle } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

interface Props {
  onSend: (content: string, images?: File[], audioBlob?: Blob, audioMime?: string) => void;
  disabled?: boolean;
  onShowShortcuts?: () => void;
}

export default forwardRef<HTMLTextAreaElement, Props>(function ChatInput(
  { onSend, disabled, onShowShortcuts },
  ref
) {
  const [text, setText]                 = useState('');
  const [images, setImages]             = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<{ id: string, url: string, name: string }[]>([]);
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

  const applyFiles = (files: File[]) => {
    const validImages = files.filter(f => f.type.startsWith('image/'));
    const oversized = validImages.filter(f => f.size > 20 * 1024 * 1024);
    
    if (oversized.length > 0) {
      alert(`Some images are over 20MB: ${oversized.map(f => f.name).join(', ')}`);
    }

    const newFiles = validImages.filter(f => f.size <= 20 * 1024 * 1024);
    if (newFiles.length === 0) return;

    setImages(prev => [...prev, ...newFiles]);

    newFiles.forEach(file => {
      const reader = new FileReader();
      const id = Math.random().toString(36).substr(2, 9);
      reader.onload = () => {
        setImagePreviews(prev => [...prev, { id, url: reader.result as string, name: file.name }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSend = () => {
    if ((!text.trim() && images.length === 0) || disabled) return;
    onSend(text.trim(), images.length > 0 ? images : undefined);
    setText('');
    setImages([]);
    setImagePreviews([]);
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
    const imgFiles = items
      .filter(i => i.type.startsWith('image/'))
      .map(i => i.getAsFile())
      .filter((f): f is File => f !== null);

    if (imgFiles.length > 0) {
      e.preventDefault();
      applyFiles(imgFiles);
    }
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
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) applyFiles(files);
  };

  // ── File picker ────────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) applyFiles(files);
    e.target.value = '';
  };

  const handleVoiceTranscript = (blob: Blob, mimeType: string) => {
    setShowVoice(false);
    onSend('', undefined, blob, mimeType);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const canSend = (text.trim().length > 0 || images.length > 0) && !disabled;

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

        {/* Image previews */}
        {imagePreviews.length > 0 && (
          <div className="image-preview-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {imagePreviews.map((prev, idx) => (
              <div key={prev.id} className="image-preview-bar" style={{ margin: 0, padding: '0.375rem 0.5rem', flex: '0 0 auto' }}>
                <img src={prev.url} alt="preview" className="image-preview-thumb" style={{ width: '1.5rem', height: '1.5rem' }} />
                <span className="image-preview-name" style={{ maxWidth: '80px' }}>{prev.name}</span>
                <button className="image-preview-remove" onClick={() => removeImage(idx)} title="Remove image">
                  <X size={12} />
                </button>
              </div>
            ))}
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
            multiple
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
