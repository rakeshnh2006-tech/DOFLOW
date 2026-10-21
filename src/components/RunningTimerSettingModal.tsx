import React from 'react';

interface RunningTimerSettingModalProps {
  isOpen: boolean;
  onApplyCurrent: () => void;
  onApplyNext: () => void;
}

export const RunningTimerSettingModal: React.FC<RunningTimerSettingModalProps> = ({
  isOpen,
  onApplyCurrent,
  onApplyNext,
}) => {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onApplyNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onApplyNext]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      data-testid="running-timer-setting-modal"
    >
      <div
        className="modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="running-setting-title"
        aria-describedby="running-setting-desc"
      >
        <div className="modal-header">
          <h3 id="running-setting-title" className="modal-title">
            Timer is Active
          </h3>
        </div>

        <p id="running-setting-desc" className="modal-body">
          You updated session durations while a timer is in progress. Would you like to
          reset the current session with the new duration, or apply it starting with your
          next session?
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary modal-btn"
            onClick={onApplyNext}
            data-testid="apply-next-session-button"
          >
            Apply to Next Session
          </button>
          <button
            type="button"
            className="btn btn-primary modal-btn modal-btn-danger"
            onClick={onApplyCurrent}
            data-testid="apply-current-session-button"
          >
            Reset Current Session
          </button>
        </div>
      </div>
    </div>
  );
};
