import React, { useEffect } from 'react';
import type { TimerMode } from '../types/timer';
import { TIMER_MODES } from '../types/timer';

interface SwitchModeModalProps {
  isOpen: boolean;
  currentMode: TimerMode;
  targetMode: TimerMode | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SwitchModeModal: React.FC<SwitchModeModalProps> = ({
  isOpen,
  currentMode,
  targetMode,
  onConfirm,
  onCancel,
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen || !targetMode) {
    return null;
  }

  const currentLabel = TIMER_MODES[currentMode].label;
  const targetLabel = TIMER_MODES[targetMode].label;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      data-testid="confirm-switch-modal"
    >
      <div
        className="modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="switch-modal-title"
        aria-describedby="switch-modal-desc"
      >
        <div className="modal-header">
          <h3 id="switch-modal-title" className="modal-title">
            Switch to {targetLabel}?
          </h3>
        </div>

        <p id="switch-modal-desc" className="modal-body">
          A {currentLabel} session is currently in progress. Switching modes will reset
          your current countdown progress.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary modal-btn"
            onClick={onCancel}
            data-testid="cancel-switch-button"
          >
            Keep Working
          </button>
          <button
            type="button"
            className="btn btn-primary modal-btn modal-btn-danger"
            onClick={onConfirm}
            data-testid="confirm-switch-button"
          >
            Switch Mode
          </button>
        </div>
      </div>
    </div>
  );
};
