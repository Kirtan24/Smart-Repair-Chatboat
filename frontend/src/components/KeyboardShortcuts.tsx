'use client';

import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['Shift', 'Esc'], action: 'Focus text input', category: 'Navigation' },
  { keys: ['Enter'], action: 'Send message', category: 'Messaging' },
  { keys: ['Shift', 'Enter'], action: 'New line in input', category: 'Messaging' },
  { keys: ['?'], action: 'Show this help menu', category: 'Navigation' },
  { keys: ['Ctrl', 'N'], action: 'New conversation', category: 'Navigation' },
  { keys: ['Esc'], action: 'Close modal or cancel', category: 'General' },
];

const categories = Array.from(new Set(SHORTCUTS.map((s) => s.category)));

export default function KeyboardShortcuts({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="shortcuts-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="shortcuts-modal">
        <div className="shortcuts-header">
          <h2>Keyboard Shortcuts</h2>
          <button className="close-btn" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="shortcuts-content">
          {categories.map((category) => (
            <div key={category} className="shortcuts-category">
              <h3 className="category-title">{category}</h3>
              <div className="shortcuts-list">
                {SHORTCUTS.filter((s) => s.category === category).map((shortcut, idx) => (
                  <div key={idx} className="shortcut-item">
                    <div className="keys">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          <kbd>{key}</kbd>
                          {i < shortcut.keys.length - 1 && <span className="plus">+</span>}
                        </span>
                      ))}
                    </div>
                    <div className="action">{shortcut.action}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="shortcuts-footer">
          <p>Press Esc to close</p>
        </div>
      </div>
    </div>
  );
}
