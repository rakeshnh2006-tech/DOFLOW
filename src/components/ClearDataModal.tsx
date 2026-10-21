import React, { useEffect } from 'react';

interface ClearDataModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  isOpen,
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onClose}
      data-testid="clear-data-confirmation-modal"
    >
      <div
        className="modal-card clear-data-modal-card"
        role="dialog"
        aria-labelledby="clear-data-modal-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="clear-data-title-group">
            <span className="clear-data-icon" aria-hidden="true">
              ⚠️
            </span>
            <div>
              <h3 className="modal-title" id="clear-data-modal-title">
                Clear All Locally Stored Data?
              </h3>
              <p className="modal-subtitle">
                Permanent and irreversible action
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Cancel and close dialog"
            data-testid="close-clear-data-btn"
          >
            ✕
          </button>
        </div>

        <div className="modal-body clear-data-body">
          <div className="clear-warning-box">
            <p className="warning-text">
              <strong>Warning:</strong> This action will permanently erase all Doflow records stored in this browser profile, including:
            </p>
            <ul className="clear-warning-list">
              <li>All tasks and active focus goal selections</li>
              <li>Daily Planner tasks, start times, and deadlines</li>
              <li>Recorded focus session timestamps and completed history</li>
              <li>Habits, streak trackers, and completion records</li>
              <li>Daily goals targets and unlocked milestones</li>
              <li>Post-session reflection ratings and notes</li>
              <li>Soundscape preferences and custom timer durations (resets to defaults)</li>
            </ul>
          </div>
          <p className="warning-consequence">
            Because Doflow operates 100% offline without remote backups, erased records cannot be recovered.
          </p>
        </div>

        <div className="modal-actions clear-data-actions">
          <button
            type="button"
            className="btn btn-secondary modal-btn"
            onClick={onClose}
            data-testid="cancel-clear-data-btn"
          >
            Keep My Data
          </button>
          <button
            type="button"
            className="btn btn-danger modal-btn"
            onClick={onConfirm}
            data-testid="confirm-clear-data-btn"
          >
            Yes, Erase Everything
          </button>
        </div>
      </div>
    </div>
  );
};
