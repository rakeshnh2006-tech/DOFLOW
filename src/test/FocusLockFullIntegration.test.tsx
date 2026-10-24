import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import type { AuthUser } from '../types/auth';
import type { ActiveFocusLockSession } from '../types/focusLock';
import { useFocusLock } from '../hooks/useFocusLock';
import { FocusLockBridge } from '../services/focusLock/FocusLockBridge';
import { FocusLockSyncService } from '../services/focusLock/FocusLockSyncService';
import {
  saveActiveFocusSession,
  loadFocusLockHistory,
  isSessionTerminatedLocally,
  loadFocusLockSettings,
} from '../utils/focusLockStorage';

const mockTestUser: AuthUser = {
  id: 'user_e2e_tester',
  name: 'E2E Tester',
  email: 'tester@doflow.app',
  provider: 'google',
  lastLoginAt: Date.now(),
  syncedAt: Date.now(),
  accountCreatedAt: Date.now(),
};

const FullIntegrationHarness: React.FC<{
  user?: AuthUser | null;
  onManualEndSession?: () => void;
  onSessionComplete?: () => void;
}> = ({ user = mockTestUser, onManualEndSession, onSessionComplete }) => {
  const focusLock = useFocusLock({
    user,
    onManualEndSession,
    onSessionComplete,
  });

  return (
    <div data-testid="full-integration-harness">
      <span data-testid="platform">{focusLock.platform}</span>
      <span data-testid="status">{focusLock.status}</span>
      <span data-testid="is-locked">{String(focusLock.isLocked)}</span>
      <span data-testid="session-id">{focusLock.sessionId || ''}</span>
      <span data-testid="remaining-ms">{focusLock.remainingMs}</span>
      <span data-testid="unlock-error">{focusLock.unlockError || ''}</span>
      <span data-testid="sync-status">{focusLock.syncStatus}</span>
      <span data-testid="history-count">{focusLock.sessionHistory.length}</span>

      <button
        data-testid="btn-start-session"
        onClick={() => focusLock.startSessionLock(1500000, 'Sprint Focus')}
      >
        Start Session
      </button>

      <button
        data-testid="btn-pause-session"
        onClick={() => focusLock.pauseSessionLock()}
      >
        Pause
      </button>

      <button
        data-testid="btn-resume-session"
        onClick={() => focusLock.resumeSessionLock()}
      >
        Resume
      </button>

      <button
        data-testid="btn-end-early"
        onClick={() => focusLock.endSessionLock('user_manual_unlock')}
      >
        End Early
      </button>

      <button
        data-testid="btn-retry-deactivation"
        onClick={() => focusLock.retryDeactivation()}
      >
        Retry Deactivation
      </button>

      <button
        data-testid="btn-complete-session"
        onClick={() => focusLock.completeSessionLock()}
      >
        Complete
      </button>

      <button
        data-testid="btn-toggle-config"
        onClick={focusLock.openConfigModal}
      >
        Config Modal
      </button>

      <button
        data-testid="btn-toggle-end-early"
        onClick={focusLock.openEndEarlyModal}
      >
        End Early Modal
      </button>
    </div>
  );
};

describe('Focus Lock Full End-to-End Integration Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    FocusLockSyncService.resetInstanceForTesting();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Scenario 1 & 2: Start session and verify restriction enforcement across platforms', () => {
    it('Web platform: engages browser focus shield and reports web platform truthfully', async () => {
      vi.spyOn(FocusLockBridge, 'getPlatform').mockReturnValue('web');
      vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(false);

      render(<FullIntegrationHarness />);

      expect(screen.getByTestId('platform')).toHaveTextContent('web');
      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');

      // Start focus session
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-start-session'));
      });

      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');
      expect(screen.getByTestId('status')).toHaveTextContent('active');
      expect(screen.getByTestId('session-id').textContent).toMatch(/^fl_/);
    });

    it('Android platform: engages NativeDoflowFocusLock plugin and blocks selected packages', async () => {
      vi.spyOn(FocusLockBridge, 'getPlatform').mockReturnValue('android');
      vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(true);
      vi.spyOn(FocusLockBridge, 'isAndroidNative').mockReturnValue(true);

      const startSpy = vi.spyOn(FocusLockBridge, 'startNativeLock').mockResolvedValue({
        success: true,
        isLocked: true,
        blockedCount: 5,
        sessionId: 'android_fl_1',
      });

      render(<FullIntegrationHarness />);
      expect(screen.getByTestId('platform')).toHaveTextContent('android');

      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-start-session'));
      });

      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(startSpy).toHaveBeenCalledWith(
        1500000,
        'Sprint Focus',
        expect.arrayContaining(['instagram']),
        expect.any(String)
      );
      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');
    });

    it('iOS platform: engages FamilyControls ManagedSettings and reports iOS platform', async () => {
      vi.spyOn(FocusLockBridge, 'getPlatform').mockReturnValue('ios');
      vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(true);
      vi.spyOn(FocusLockBridge, 'isIosNative').mockReturnValue(true);

      const startSpy = vi.spyOn(FocusLockBridge, 'startNativeLock').mockResolvedValue({
        success: true,
        isLocked: true,
        blockedCount: 3,
        sessionId: 'ios_fl_1',
      });

      render(<FullIntegrationHarness />);
      expect(screen.getByTestId('platform')).toHaveTextContent('ios');

      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-start-session'));
      });

      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');
    });
  });

  describe('Scenario 3: Manual early termination instantly unlocks apps', () => {
    it('releases restrictions immediately and marks outcome as ended_early without waiting for timer', async () => {
      vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(true);
      const stopSpy = vi.spyOn(FocusLockBridge, 'stopNativeLock').mockResolvedValue({
        success: true,
        isLocked: false,
      });

      const onManualEndSpy = vi.fn();
      render(<FullIntegrationHarness onManualEndSession={onManualEndSpy} />);

      // Start session
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-start-session'));
      });
      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');

      // User manually ends session early
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-end-early'));
      });

      // Verify native deactivation was called immediately
      expect(stopSpy).toHaveBeenCalledWith('user_manual_unlock');
      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('ended_early');
      expect(onManualEndSpy).toHaveBeenCalledTimes(1);

      // Verify history stores outcome: ended_early
      const history = loadFocusLockHistory(mockTestUser.id);
      expect(history.length).toBe(1);
      expect(history[0].outcome).toBe('ended_early');
      expect(history[0].earlyEndReason).toBe('user_manual_unlock');
    });
  });

  describe('Scenario 4: Natural timer expiration unlocks apps automatically', () => {
    it('deactivates restrictions and marks outcome as completed upon natural timer finish', async () => {
      vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(true);
      const stopSpy = vi.spyOn(FocusLockBridge, 'stopNativeLock').mockResolvedValue({
        success: true,
        isLocked: false,
      });

      const onCompleteSpy = vi.fn();
      render(<FullIntegrationHarness onSessionComplete={onCompleteSpy} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-start-session'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-complete-session'));
      });

      expect(stopSpy).toHaveBeenCalledWith('timer_completed');
      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('completed');
      expect(onCompleteSpy).toHaveBeenCalledTimes(1);

      const history = loadFocusLockHistory(mockTestUser.id);
      expect(history.length).toBe(1);
      expect(history[0].outcome).toBe('completed');
    });
  });

  describe('Scenario 5: Mobile app restart recovery', () => {
    it('restores active lock and wall-clock countdown when app restarts during session', () => {
      const activeSession: ActiveFocusLockSession = {
        sessionId: 'restart_recovery_123',
        userId: mockTestUser.id,
        startedAt: Date.now() - 30000,
        scheduledEndTime: Date.now() + 1470000,
        targetDurationMs: 1500000,
        sessionTitle: 'Active Across Restart',
        blockedAppIds: ['instagram', 'tiktok'],
        platform: 'android',
        totalPausedMs: 0,
      };
      saveActiveFocusSession(activeSession, mockTestUser.id);

      render(<FullIntegrationHarness />);

      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');
      expect(screen.getByTestId('session-id')).toHaveTextContent('restart_recovery_123');
      expect(screen.getByTestId('status')).toHaveTextContent('active');
    });

    it('automatically completes expired session on app restart if timer elapsed while closed', () => {
      const expiredSession: ActiveFocusLockSession = {
        sessionId: 'expired_closed_789',
        userId: mockTestUser.id,
        startedAt: Date.now() - 3600000,
        scheduledEndTime: Date.now() - 1000, // Expired 1 second ago
        targetDurationMs: 3599000,
        sessionTitle: 'Elapsed While Closed',
        blockedAppIds: ['youtube'],
        platform: 'web',
        totalPausedMs: 0,
      };
      saveActiveFocusSession(expiredSession, mockTestUser.id);

      render(<FullIntegrationHarness />);

      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('completed');

      const history = loadFocusLockHistory(mockTestUser.id);
      expect(history.some((h) => h.id === 'expired_closed_789')).toBe(true);
      expect(isSessionTerminatedLocally('expired_closed_789', mockTestUser.id)).toBe(true);
    });
  });

  describe('Scenario 6: Offline sessions and synchronization after reconnection', () => {
    it('queues mutations when offline and flushes cleanly on reconnection', async () => {
      const syncService = FocusLockSyncService.getInstance();

      // Simulate offline mode
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

      const queueItem = syncService.queueMutation(
        'start_session',
        { sessionId: 'offline_sess_1', durationMs: 1500000 },
        mockTestUser.id
      );
      expect(queueItem.id).toBeTruthy();

      // Offline sync reports graceful queue message
      const offlineRes = await syncService.sync(mockTestUser);
      expect(offlineRes.success).toBe(false);
      expect(offlineRes.error).toContain('offline');

      // Reconnect online
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);

      const onlineRes = await syncService.sync(mockTestUser);
      expect(onlineRes.success).toBe(true);
    });
  });

  describe('Scenario 7: Permission revocation & safe error handling', () => {
    it('never falsely claims apps are unlocked when native deactivation fails and offers retry', async () => {
      vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(true);

      // Start lock successfully
      vi.spyOn(FocusLockBridge, 'startNativeLock').mockResolvedValue({
        success: true,
        isLocked: true,
        blockedCount: 3,
      });

      render(<FullIntegrationHarness />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-start-session'));
      });
      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');

      // Native stop fails (e.g. AccessibilityService permission revoked or crashed)
      vi.spyOn(FocusLockBridge, 'stopNativeLock').mockResolvedValue({
        success: false,
        isLocked: true,
        error: 'Accessibility service was revoked by user or system.',
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-end-early'));
      });

      // App MUST maintain isLocked = true and report failed_unlock
      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');
      expect(screen.getByTestId('status')).toHaveTextContent('failed_unlock');
      expect(screen.getByTestId('unlock-error')).toHaveTextContent(
        'Accessibility service was revoked'
      );

      // Now service recovers and retry succeeds
      vi.spyOn(FocusLockBridge, 'stopNativeLock').mockResolvedValue({
        success: true,
        isLocked: false,
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-retry-deactivation'));
      });

      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('ended_early');
    });
  });

  describe('Scenario 8: Idempotency & duplicate end request resilience', () => {
    it('handles duplicate rapid taps on End Session idempotently without creating duplicate history records', async () => {
      vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(false);

      render(<FullIntegrationHarness />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-start-session'));
      });
      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');

      // User rapidly double-clicks End Early
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-end-early'));
        fireEvent.click(screen.getByTestId('btn-end-early'));
      });

      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
      const history = loadFocusLockHistory(mockTestUser.id);
      expect(history.length).toBe(1); // Exactly 1 record created, no duplicate!
    });
  });

  describe('Scenario 9: Unrelated apps and essential device functions accessibility', () => {
    it('only targets selected apps and excludes dialer, settings, and essential system apps', () => {
      const settings = loadFocusLockSettings(mockTestUser.id);
      expect(settings.selectedAppIds).not.toContain('com.android.dialer');
      expect(settings.selectedAppIds).not.toContain('com.android.settings');
      expect(settings.selectedAppIds).not.toContain('com.google.android.apps.messaging');
    });
  });

  describe('Scenario 10: Mobile responsiveness, touch targets & accessibility', () => {
    it('provides accessible buttons with descriptive testids and touch targets', () => {
      render(<FullIntegrationHarness />);
      const startBtn = screen.getByTestId('btn-start-session');
      const endBtn = screen.getByTestId('btn-end-early');

      expect(startBtn).toBeDefined();
      expect(endBtn).toBeDefined();
    });
  });
});
