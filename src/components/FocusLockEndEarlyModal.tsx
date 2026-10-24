import React from 'react';

interface FocusLockEndEarlyModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  remainingMinutes?: number;
  remainingDisplay?: string;
  isUnlocking?: boolean;
  unlockError?: string | null;
  onRetryUnlock?: () => void;
  blockedAppCount?: number;
}

export const FocusLockEndEarlyModal: React.FC<FocusLockEndEarlyModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  remainingMinutes = 0,
  remainingDisplay,
  isUnlocking = false,
  unlockError = null,
  onRetryUnlock,
  blockedAppCount = 0,
}) => {
  if (!isOpen) return null;

  const timeText = remainingDisplay
    ? `${remainingDisplay} remaining`
    : remainingMinutes > 0
    ? `approx. ${remainingMinutes} min remaining`
    : '';

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-early-modal-title"
      data-testid="end-early-modal"
      onClick={(e) => {
        if (!isUnlocking && e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal-content end-early-modal-content">
        <div className="modal-header">
          <div className="end-early-icon" aria-hidden="true">
            {unlockError ? '⚠️' : '🔓'}
          </div>
          <h3 id="end-early-modal-title" className="modal-title">
            {unlockError ? 'Restriction Deactivation Issue' : 'End Focus Session Early?'}
          </h3>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onCancel}
            disabled={isUnlocking}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {unlockError ? (
            <div className="unlock-error-banner" role="alert" data-testid="unlock-error-banner">
              <h4 className="unlock-error-title">Apps are still restricted</h4>
              <p className="unlock-error-message">{unlockError}</p>
              <p className="unlock-error-hint">
                Doflow guarantees user sovereignty: we will not falsely report apps as unlocked.
                Please retry deactivation, or check system settings if necessary.
              </p>
            </div>
          ) : (
            <>
              <p className="end-early-desc">
                Your focus session is still in progress
                {timeText ? ` with ${timeText}` : ''}.
              </p>
              <div className="end-early-callout">
                <span className="callout-icon" aria-hidden="true">
                  ℹ️
                </span>
                <p className="end-early-subdesc">
                  Ending now will <strong>immediately remove all app restrictions</strong>
                  {blockedAppCount > 0 ? ` on your ${blockedAppCount} selected apps` : ''}.
                  You do not need to wait for the timer to expire.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {unlockError ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                data-testid="dismiss-unlock-error-btn"
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={onRetryUnlock || onConfirm}
                disabled={isUnlocking}
                data-testid="retry-unlock-btn"
              >
                {isUnlocking ? 'Retrying Unlock...' : 'Retry Deactivation'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancel}
                disabled={isUnlocking}
                data-testid="cancel-end-early-btn"
              >
                Stay Focused
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={onConfirm}
                disabled={isUnlocking}
                data-testid="confirm-end-early-btn"
              >
                {isUnlocking ? 'Unlocking Apps...' : 'Unlock & End Session'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
