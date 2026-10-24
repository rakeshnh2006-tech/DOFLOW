import React from 'react';
import type { TimerStatus, TimerMode } from '../types/timer';
import type { FocusLockStatus } from '../types/focusLock';

interface FocusLockBannerProps {
  isLocked: boolean;
  enabled: boolean;
  blockedAppCount: number;
  timerStatus: TimerStatus;
  timerMode: TimerMode;
  status?: FocusLockStatus;
  remainingDisplay?: string;
  unlockError?: string | null;
  onOpenConfig: () => void;
  onEndSessionEarly: () => void;
  onRetryUnlock?: () => void;
  platform: 'web' | 'android' | 'ios';
}

export const FocusLockBanner: React.FC<FocusLockBannerProps> = ({
  isLocked,
  enabled,
  blockedAppCount,
  timerStatus,
  timerMode,
  status,
  remainingDisplay,
  unlockError,
  onOpenConfig,
  onEndSessionEarly,
  onRetryUnlock,
  platform,
}) => {
  const isFocusMode = timerMode === 'focus';
  const isSessionActive =
    (timerStatus === 'running' || timerStatus === 'paused' || isLocked) && isFocusMode;
  const isPaused = timerStatus === 'paused' || status === 'paused';
  const hasFailedUnlock = status === 'failed_unlock' || Boolean(unlockError);

  // Active Session State with Focus Lock engaged (or failed unlock error state)
  if ((isSessionActive && enabled) || hasFailedUnlock) {
    return (
      <aside
        className={`focus-lock-active-banner ${hasFailedUnlock ? 'banner-error-state' : isPaused ? 'banner-paused-state' : ''}`}
        role="status"
        aria-live="polite"
        data-testid="focus-lock-active-banner"
      >
        <div className="banner-glow-effect" aria-hidden="true" />

        <div className="banner-content-group">
          <div className={`banner-status-badge ${hasFailedUnlock ? 'badge-error' : isPaused ? 'badge-paused' : ''}`}>
            <span className="pulse-dot" aria-hidden="true" />
            <span className="badge-lock-icon" aria-hidden="true">
              {hasFailedUnlock ? '⚠️' : '🔒'}
            </span>
            <span className="badge-text">
              {hasFailedUnlock
                ? 'Unlock Incomplete'
                : isPaused
                ? 'Session Paused (Restrictions Active)'
                : 'Focus Lock Engaged'}
            </span>
          </div>

          <div className="banner-info">
            <h3 className="banner-headline">
              {hasFailedUnlock ? (
                'Restrictions Still Active'
              ) : (
                <>
                  {blockedAppCount} {blockedAppCount === 1 ? 'App' : 'Apps'} Blocked
                  {remainingDisplay ? ` · ${remainingDisplay}` : ''}
                </>
              )}
            </h3>
            <p className="banner-subtext">
              {hasFailedUnlock ? (
                unlockError || 'Unable to confirm restriction removal. Tap Retry to unlock apps.'
              ) : platform === 'web' ? (
                'Tab shield & distraction protection active'
              ) : (
                'Native app restrictions active — tap End Session to unlock anytime'
              )}
            </p>
          </div>
        </div>

        <div className="banner-actions">
          {hasFailedUnlock && onRetryUnlock ? (
            <button
              type="button"
              className="btn btn-warning btn-banner-retry"
              onClick={onRetryUnlock}
              aria-label="Retry deactivating app restrictions"
              data-testid="banner-retry-unlock-btn"
            >
              Retry Unlock
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-banner-config"
              onClick={onOpenConfig}
              aria-label="Manage blocked apps"
              title="Manage blocked apps"
              data-testid="banner-manage-apps-btn"
            >
              Manage Apps
            </button>
          )}

          {/* End Session Button: Always accessible during active or paused focus session */}
          <button
            type="button"
            className="btn btn-danger btn-end-session"
            onClick={onEndSessionEarly}
            aria-label="Manually end focus session and unlock all apps"
            data-testid="end-focus-session-btn"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
            <span>{hasFailedUnlock ? 'Force End' : 'End Session'}</span>
          </button>
        </div>
      </aside>
    );
  }

  // Idle or Break State Chip
  return (
    <div className="focus-lock-pill-container" data-testid="focus-lock-pill-container">
      <div className={`focus-lock-pill ${enabled ? 'active' : 'disabled'}`}>
        <button
          type="button"
          className="pill-trigger-btn"
          onClick={onOpenConfig}
          aria-label={`Configure Focus Lock: currently ${enabled ? 'enabled' : 'disabled'}`}
          data-testid="open-focus-lock-config-btn"
        >
          <span className="pill-lock-icon" aria-hidden="true">
            {enabled ? '🔒' : '🔓'}
          </span>
          <span className="pill-title">Focus Lock</span>
          <span className="pill-badge">
            {enabled ? `${blockedAppCount} apps selected` : 'Off'}
          </span>
          <span className="pill-chevron" aria-hidden="true">
            ⚙️
          </span>
        </button>
      </div>
    </div>
  );
};
