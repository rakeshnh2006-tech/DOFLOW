import React, { useState } from 'react';
import type { SessionQuality } from '../types/intelligence';

interface SessionReflectionModalProps {
  isOpen: boolean;
  sessionId: string | null;
  onSave: (sessionId: string, quality: SessionQuality, note?: string) => void;
  onSkip: () => void;
}

export const SessionReflectionModal: React.FC<SessionReflectionModalProps> = ({
  isOpen,
  sessionId,
  onSave,
  onSkip,
}) => {
  const [quality, setQuality] = useState<SessionQuality>('productive');
  const [note, setNote] = useState('');

  const [prevSessionId, setPrevSessionId] = useState<string | null>(sessionId);
  if (sessionId !== prevSessionId) {
    setPrevSessionId(sessionId);
    setQuality('productive');
    setNote('');
  }

  if (!isOpen || !sessionId) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(sessionId, quality, note.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onSkip();
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onSkip}
      onKeyDown={handleKeyDown}
      data-testid="reflection-modal"
    >
      <div
        className="modal-card reflection-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reflection-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="reflection-title-group">
            <span className="reflection-celebration-icon" aria-hidden="true">
              ✨
            </span>
            <div>
              <h3 id="reflection-modal-title" className="modal-title">
                Session Complete!
              </h3>
              <p className="modal-subtitle">How was your focus flow?</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onSkip}
            aria-label="Skip reflection"
            data-testid="skip-reflection-close-btn"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Quality Options */}
          <div className="setting-field">
            <label className="setting-label">Flow Quality</label>
            <div
              className="reflection-quality-group"
              role="radiogroup"
              aria-label="Focus session quality rating"
            >
              <button
                type="button"
                role="radio"
                aria-checked={quality === 'productive'}
                className={`quality-option-btn quality-productive ${
                  quality === 'productive' ? 'selected' : ''
                }`}
                onClick={() => setQuality('productive')}
                data-testid="quality-btn-productive"
              >
                <span className="quality-icon" aria-hidden="true">
                  🟢
                </span>
                <span className="quality-text-wrap">
                  <span className="quality-name">Productive</span>
                  <span className="quality-hint">Smooth flow, minimal friction</span>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={quality === 'distracted'}
                className={`quality-option-btn quality-distracted ${
                  quality === 'distracted' ? 'selected' : ''
                }`}
                onClick={() => setQuality('distracted')}
                data-testid="quality-btn-distracted"
              >
                <span className="quality-icon" aria-hidden="true">
                  🟡
                </span>
                <span className="quality-text-wrap">
                  <span className="quality-name">Distracted</span>
                  <span className="quality-hint">Wandering focus or multitasking</span>
                </span>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={quality === 'interrupted'}
                className={`quality-option-btn quality-interrupted ${
                  quality === 'interrupted' ? 'selected' : ''
                }`}
                onClick={() => setQuality('interrupted')}
                data-testid="quality-btn-interrupted"
              >
                <span className="quality-icon" aria-hidden="true">
                  🔴
                </span>
                <span className="quality-text-wrap">
                  <span className="quality-name">Interrupted</span>
                  <span className="quality-hint">External block or disruption</span>
                </span>
              </button>
            </div>
          </div>

          {/* Optional Short Note */}
          <div className="setting-field">
            <label htmlFor="reflection-note-input" className="setting-label">
              Quick Note (optional)
            </label>
            <input
              id="reflection-note-input"
              type="text"
              maxLength={200}
              className="task-input"
              placeholder="e.g. Finished documentation, felt great"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              data-testid="reflection-note-input"
            />
          </div>

          {/* Modal Actions */}
          <div className="modal-actions reflection-actions">
            <button
              type="button"
              className="btn btn-secondary modal-btn"
              onClick={onSkip}
              data-testid="skip-reflection-btn"
            >
              Skip
            </button>
            <button
              type="submit"
              className="btn btn-primary modal-btn"
              data-testid="save-reflection-btn"
            >
              Save Reflection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
