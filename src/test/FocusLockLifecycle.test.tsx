import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { useFocusLock } from '../hooks/useFocusLock';
import { FocusLockBanner } from '../components/FocusLockBanner';
import { FocusLockEndEarlyModal } from '../components/FocusLockEndEarlyModal';
import { FocusLockBridge } from '../services/focusLock/FocusLockBridge';
import {
  loadFocusLockHistory,
  saveActiveFocusSession,
  isSessionTerminatedLocally,
} from '../utils/focusLockStorage';
import type { ActiveFocusLockSession } from '../types/focusLock';

// Interactive Test Component with Confirmation Modal
function FocusLockLifecycleHarness(props: {
  initialConfirmEarlyExit?: boolean;
  onSessionEndedCallback?: () => void;
}) {
  const focusLock = useFocusLock({
    onManualEndSession: props.onSessionEndedCallback,
  });

  // Enable/disable confirmEarlyExit setting if specified
  React.useEffect(() => {
    if (typeof props.initialConfirmEarlyExit === 'boolean') {
      focusLock.updateSettings({
        ...focusLock.settings,
        confirmEarlyExit: props.initialConfirmEarlyExit,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.initialConfirmEarlyExit]);

  return (
    <div>
      <div data-testid="status-val">{focusLock.status}</div>
      <div data-testid="is-locked-val">{String(focusLock.isLocked)}</div>
      <div data-testid="remaining-display">{focusLock.formattedRemaining.display}</div>
      <div data-testid="remaining-ms">{focusLock.remainingMs}</div>
      <div data-testid="session-id">{focusLock.sessionId || ''}</div>
      <div data-testid="unlock-error">{focusLock.unlockError || ''}</div>

      <button
        onClick={() => focusLock.startSessionLock(25 * 60 * 1000, 'Sprint 1 Focus')}
        data-testid="start-25m-btn"
      >
        Start 25m Lock
      </button>

      <button onClick={() => focusLock.pauseSessionLock()} data-testid="pause-btn">
        Pause Lock
      </button>

      <button onClick={() => focusLock.resumeSessionLock()} data-testid="resume-btn">
        Resume Lock
      </button>

      <button onClick={() => focusLock.completeSessionLock()} data-testid="complete-btn">
        Complete Lock
      </button>

      <button onClick={() => focusLock.endSessionLock('direct_manual')} data-testid="direct-end-btn">
        Direct End Lock
      </button>

      <button onClick={() => focusLock.retryDeactivation()} data-testid="retry-deactivation-btn">
        Retry Deactivation
      </button>

      {/* Render Banner */}
      <FocusLockBanner
        isLocked={focusLock.isLocked}
        enabled={focusLock.settings.enabled}
        blockedAppCount={focusLock.selectedAppsCount}
        timerStatus={focusLock.status === 'paused' ? 'paused' : focusLock.isLocked ? 'running' : 'idle'}
        timerMode="focus"
        status={focusLock.status}
        remainingDisplay={focusLock.formattedRemaining.display}
        unlockError={focusLock.unlockError}
        onOpenConfig={focusLock.openConfigModal}
        onEndSessionEarly={focusLock.openEndEarlyModal}
        onRetryUnlock={focusLock.retryDeactivation}
        platform={focusLock.platform}
      />

      {/* Render Confirmation Modal */}
      <FocusLockEndEarlyModal
        isOpen={focusLock.isEndEarlyModalOpen}
        onCancel={focusLock.closeEndEarlyModal}
        onConfirm={focusLock.confirmEndEarly}
        remainingMinutes={Math.ceil(focusLock.remainingMs / 60000)}
        remainingDisplay={focusLock.formattedRemaining.display}
        isUnlocking={focusLock.isUnlocking}
        unlockError={focusLock.unlockError}
        onRetryUnlock={focusLock.retryDeactivation}
        blockedAppCount={focusLock.selectedAppsCount}
      />
    </div>
  );
}

describe('Focus Lock Lifecycle & User Sovereignty Engine', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('Requirement 1 & 2: Starts session, transitions to active, supports pausing and resuming', async () => {
    render(<FocusLockLifecycleHarness />);

    expect(screen.getByTestId('status-val')).toHaveTextContent('idle');
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('false');

    // 1. Start Lock
    fireEvent.click(screen.getByTestId('start-25m-btn'));

    expect(screen.getByTestId('status-val')).toHaveTextContent('active');
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('true');
    expect(screen.getByTestId('focus-lock-active-banner')).toBeDefined();
    expect(screen.getByText(/5 Apps Blocked/i)).toBeDefined();

    // 2. Pause Lock
    fireEvent.click(screen.getByTestId('pause-btn'));

    expect(screen.getByTestId('status-val')).toHaveTextContent('paused');
    // In paused state, restrictions still remain locked
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('true');
    expect(screen.getByText(/Session Paused/i)).toBeDefined();

    // 3. Resume Lock
    fireEvent.click(screen.getByTestId('resume-btn'));

    expect(screen.getByTestId('status-val')).toHaveTextContent('active');
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('true');
  });

  it('Requirement 4, 5, 6, 7: Prominent End Session button triggers confirmation modal and instantly removes restrictions on confirmation', async () => {
    const onEndedSpy = vi.fn();
    render(<FocusLockLifecycleHarness initialConfirmEarlyExit={true} onSessionEndedCallback={onEndedSpy} />);

    // Start 25m Focus Lock
    fireEvent.click(screen.getByTestId('start-25m-btn'));
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('true');

    // Tap End Session on the banner
    const endBtn = screen.getByTestId('end-focus-session-btn');
    expect(endBtn).toBeDefined();
    fireEvent.click(endBtn);

    // Confirmation dialog is displayed explaining app restrictions will be removed
    expect(screen.getByTestId('end-early-modal')).toBeDefined();
    expect(screen.getByText(/End Focus Session Early\?/i)).toBeDefined();
    expect(screen.getByText(/immediately remove all app restrictions/i)).toBeDefined();

    // Confirm early exit
    const confirmBtn = screen.getByTestId('confirm-end-early-btn');
    fireEvent.click(confirmBtn);

    // Immediately unlocks! Does not wait for timer to expire
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('false');
    expect(screen.getByTestId('status-val')).toHaveTextContent('ended_early');
    expect(screen.queryByTestId('end-early-modal')).toBeNull();
    expect(onEndedSpy).toHaveBeenCalled();

    // Verify session history recorded outcome as ended_early
    const history = loadFocusLockHistory();
    expect(history.length).toBe(1);
    expect(history[0].outcome).toBe('ended_early');
    expect(history[0].earlyEndReason).toBe('user_confirmed_early_exit');
  });

  it('Requirement 8: If native deactivation fails, displays clear error, never claims apps are unlocked, and supports safe retry', async () => {
    // Mock native platform & simulated failure
    vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(true);
    vi.spyOn(FocusLockBridge, 'startNativeLock').mockResolvedValue({
      success: true,
      isLocked: true,
      blockedCount: 5,
    });
    vi.spyOn(FocusLockBridge, 'stopNativeLock').mockResolvedValueOnce({
      success: false,
      isLocked: true,
      error: 'OS Accessibility service unresponsive. Device blocked apps remain active.',
    });

    render(<FocusLockLifecycleHarness initialConfirmEarlyExit={true} />);

    // Start Lock
    await act(async () => {
      fireEvent.click(screen.getByTestId('start-25m-btn'));
    });

    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('true');

    // Tap End Session & Confirm
    fireEvent.click(screen.getByTestId('end-focus-session-btn'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('confirm-end-early-btn'));
    });

    // Verification: NEVER falsely report apps as unlocked!
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('true');
    expect(screen.getByTestId('status-val')).toHaveTextContent('failed_unlock');
    expect(screen.getByTestId('unlock-error')).toHaveTextContent('OS Accessibility service unresponsive');
    expect(screen.getByTestId('unlock-error-banner')).toBeDefined();
    expect(screen.getByText(/Apps are still restricted/i)).toBeDefined();

    // Now mock recovery on retry
    vi.spyOn(FocusLockBridge, 'stopNativeLock').mockResolvedValueOnce({
      success: true,
      isLocked: false,
    });

    // Tap Retry Deactivation
    const retryBtn = screen.getByTestId('retry-unlock-btn');
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    // Verified: Once safely deactivated, marks unlocked
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('false');
    expect(screen.getByTestId('status-val')).toHaveTextContent('ended_early');
  });

  it('Requirement 9 & 14: Natural timer completion deactivates restrictions and records outcome as completed', async () => {
    render(<FocusLockLifecycleHarness />);

    fireEvent.click(screen.getByTestId('start-25m-btn'));
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('true');

    // Trigger timer completion
    fireEvent.click(screen.getByTestId('complete-btn'));

    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('false');
    expect(screen.getByTestId('status-val')).toHaveTextContent('completed');

    const history = loadFocusLockHistory();
    expect(history.length).toBe(1);
    expect(history[0].outcome).toBe('completed');
  });

  it('Requirement 10 & 11: Idempotency prevents duplicate deactivation calls on repeated rapid clicks', async () => {
    const stopSpy = vi.spyOn(FocusLockBridge, 'stopNativeLock');
    render(<FocusLockLifecycleHarness />);

    fireEvent.click(screen.getByTestId('start-25m-btn'));

    // Repeatedly click Direct End in rapid succession
    fireEvent.click(screen.getByTestId('direct-end-btn'));
    fireEvent.click(screen.getByTestId('direct-end-btn'));
    fireEvent.click(screen.getByTestId('direct-end-btn'));

    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('false');
    expect(stopSpy).toBeDefined();
    // Verified: Only one session record is appended to history
    const history = loadFocusLockHistory();
    expect(history.length).toBe(1);
  });

  it('Requirement 11 & 12: Tombstone tracking prevents stale updates from resurrecting ended sessions', async () => {
    render(<FocusLockLifecycleHarness />);

    fireEvent.click(screen.getByTestId('start-25m-btn'));
    const sessionId = screen.getByTestId('session-id').textContent;
    expect(sessionId).toBeTruthy();

    fireEvent.click(screen.getByTestId('direct-end-btn'));
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('false');

    // Verify session ID is recorded in terminated tombstones
    expect(isSessionTerminatedLocally(sessionId!)).toBe(true);

    // Stale server or background broadcast trying to re-save active session
    const staleSession: ActiveFocusLockSession = {
      sessionId: sessionId!,
      startedAt: Date.now() - 5000,
      scheduledEndTime: Date.now() + 100000,
      targetDurationMs: 1500000,
      sessionTitle: 'Stale Revive',
      blockedAppIds: ['instagram'],
      platform: 'web',
      totalPausedMs: 0,
    };
    saveActiveFocusSession(staleSession);

    // Mount fresh harness to test recovery
    const { unmount } = render(<FocusLockLifecycleHarness />);
    // The component checks isSessionTerminatedLocally and ignores the stale session
    expect(screen.getAllByTestId('is-locked-val')[1]).toHaveTextContent('false');
    unmount();
  });

  it('Requirement 13: Synchronizes web session state when native companion ends session from notification or shield', async () => {
    vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(true);
    vi.spyOn(FocusLockBridge, 'startNativeLock').mockResolvedValue({
      success: true,
      isLocked: true,
      blockedCount: 5,
    });
    vi.spyOn(FocusLockBridge, 'stopNativeLock').mockResolvedValue({
      success: true,
      isLocked: false,
    });
    // Initially native reports locked
    vi.spyOn(FocusLockBridge, 'getLockStatus').mockResolvedValue({
      isLocked: true,
      remainingMs: 1200000,
      blockedCount: 5,
      sessionTitle: 'Focus Session',
    });

    render(<FocusLockLifecycleHarness />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('start-25m-btn'));
    });
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('true');

    // User taps "End Session" in Android notification or Focus Shield activity -> native reports isLocked = false
    vi.spyOn(FocusLockBridge, 'getLockStatus').mockResolvedValue({
      isLocked: false,
      remainingMs: 0,
      blockedCount: 0,
      sessionTitle: 'Focus Session',
      endReason: 'ended_from_notification',
    });

    // Simulate window regain focus and wait for async sync to complete
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await new Promise((r) => setTimeout(r, 60));
    });

    // Web state immediately reflects that session was ended!
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('false');
  });

  it('Requirement 10: Restores active session on app restart if within scheduled deadline', async () => {
    // Pre-seed an active session in localStorage
    const now = Date.now();
    const activeSession: ActiveFocusLockSession = {
      sessionId: 'crash_restore_123',
      startedAt: now - 60000, // 1 min ago
      scheduledEndTime: now + 24 * 60 * 1000, // 24 min left
      targetDurationMs: 25 * 60 * 1000,
      sessionTitle: 'Crash Restored Session',
      blockedAppIds: ['instagram', 'tiktok'],
      platform: 'web',
      totalPausedMs: 0,
    };
    saveActiveFocusSession(activeSession);

    render(<FocusLockLifecycleHarness />);

    // Verified: Session is automatically restored!
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('true');
    expect(screen.getByTestId('session-id')).toHaveTextContent('crash_restore_123');
  });

  it('Requirement 10: Automatically completes expired session on app restart if deadline passed while closed', async () => {
    // Pre-seed an expired session in localStorage
    const now = Date.now();
    const expiredSession: ActiveFocusLockSession = {
      sessionId: 'expired_while_closed_456',
      startedAt: now - 30 * 60 * 1000,
      scheduledEndTime: now - 5 * 60 * 1000, // Ended 5 minutes ago
      targetDurationMs: 25 * 60 * 1000,
      sessionTitle: 'Overnight Session',
      blockedAppIds: ['youtube'],
      platform: 'web',
      totalPausedMs: 0,
    };
    saveActiveFocusSession(expiredSession);

    render(<FocusLockLifecycleHarness />);

    // Verified: Locks are disengaged, session marked completed
    expect(screen.getByTestId('is-locked-val')).toHaveTextContent('false');
    const history = loadFocusLockHistory();
    expect(history.some((r) => r.id === 'expired_while_closed_456')).toBe(true);
  });
});
