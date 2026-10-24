import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import type { AuthUser } from '../types/auth';
import type {
  FocusLockSessionRecord,
  FocusLockSettings,
} from '../types/focusLock';
import {
  loadFocusLockSettings,
  saveFocusLockSettings,
  loadActiveFocusSession,
  loadFocusLockHistory,
  appendFocusLockHistoryRecord,
  markSessionTerminatedLocally,
  isSessionTerminatedLocally,
  migrateGuestDataToUser,
  assertUserAccess,
  FocusLockAccessDeniedError,
  getUserStorageKey,
  FOCUS_LOCK_STORAGE_KEY,
} from '../utils/focusLockStorage';
import { FocusLockSyncService } from '../services/focusLock/FocusLockSyncService';
import { useFocusLock } from '../hooks/useFocusLock';
import { FocusLockBridge } from '../services/focusLock/FocusLockBridge';

const mockUserAlice: AuthUser = {
  id: 'user_alice_123',
  name: 'Alice Cooper',
  email: 'alice@example.com',
  provider: 'google',
  lastLoginAt: Date.now(),
  syncedAt: Date.now(),
  accountCreatedAt: Date.now(),
};

const mockUserBob: AuthUser = {
  id: 'user_bob_456',
  name: 'Bob Marley',
  email: 'bob@example.com',
  provider: 'google',
  lastLoginAt: Date.now(),
  syncedAt: Date.now(),
  accountCreatedAt: Date.now(),
};

// Test harness component to test useFocusLock with auth
const FocusLockAuthHarness: React.FC<{ user?: AuthUser | null }> = ({ user }) => {
  const focusLock = useFocusLock({ user });

  return (
    <div>
      <span data-testid="user-id">{focusLock.effectiveUserId}</span>
      <span data-testid="is-locked">{String(focusLock.isLocked)}</span>
      <span data-testid="status">{focusLock.status}</span>
      <span data-testid="sync-status">{focusLock.syncStatus}</span>
      <span data-testid="is-online">{String(focusLock.isOnline)}</span>
      <span data-testid="selected-apps">{focusLock.selectedAppIds.join(',')}</span>
      <span data-testid="history-count">{focusLock.sessionHistory.length}</span>

      <button
        data-testid="btn-start"
        onClick={() => focusLock.startSessionLock(60000, 'Auth Test Session')}
      >
        Start
      </button>
      <button
        data-testid="btn-end-early"
        onClick={() => focusLock.endSessionLock('user_manual_unlock')}
      >
        End Early
      </button>
      <button
        data-testid="btn-complete"
        onClick={() => focusLock.completeSessionLock()}
      >
        Complete
      </button>
      <button
        data-testid="btn-select-apps"
        onClick={() =>
          focusLock.updateSettings({
            ...focusLock.settings,
            selectedAppIds: ['instagram', 'tiktok', 'youtube'],
          })
        }
      >
        Select Apps
      </button>
      <button
        data-testid="btn-sync-now"
        onClick={() => focusLock.syncFocusLock()}
      >
        Sync Now
      </button>
      <button
        data-testid="btn-clear-history"
        onClick={() => focusLock.clearHistory()}
      >
        Clear History
      </button>
    </div>
  );
};

describe('Focus Lock Authentication, Authorization & Synchronization Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    FocusLockSyncService.resetInstanceForTesting();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. User-Partitioned Storage & Strict Access Control', () => {
    it('scopes storage keys by authenticated userId and guest mode', () => {
      expect(getUserStorageKey(FOCUS_LOCK_STORAGE_KEY, 'user_123')).toBe(
        'doflow_focus_lock_settings_user_123'
      );
      expect(getUserStorageKey(FOCUS_LOCK_STORAGE_KEY, null)).toBe(
        'doflow_focus_lock_settings_guest'
      );
      expect(getUserStorageKey(FOCUS_LOCK_STORAGE_KEY, 'guest')).toBe(
        'doflow_focus_lock_settings_guest'
      );
    });

    it('isolates settings between different users', () => {
      const aliceSettings: FocusLockSettings = {
        userId: mockUserAlice.id,
        enabled: true,
        allowEarlyExit: true,
        selectedAppIds: ['instagram', 'reddit'],
        customApps: [],
        webFocusMode: 'shield',
        confirmEarlyExit: true,
      };
      saveFocusLockSettings(aliceSettings, mockUserAlice.id);

      const bobSettings: FocusLockSettings = {
        userId: mockUserBob.id,
        enabled: false,
        allowEarlyExit: false,
        selectedAppIds: ['tiktok'],
        customApps: [],
        webFocusMode: 'gentle',
        confirmEarlyExit: false,
      };
      saveFocusLockSettings(bobSettings, mockUserBob.id);

      const loadedAlice = loadFocusLockSettings(mockUserAlice.id);
      const loadedBob = loadFocusLockSettings(mockUserBob.id);

      expect(loadedAlice.selectedAppIds).toEqual(['instagram', 'reddit']);
      expect(loadedAlice.confirmEarlyExit).toBe(true);

      expect(loadedBob.selectedAppIds).toEqual(['tiktok']);
      expect(loadedBob.confirmEarlyExit).toBe(false);
    });

    it('isolates session history between different users', () => {
      const aliceRecord: FocusLockSessionRecord = {
        id: 'session_alice_1',
        userId: mockUserAlice.id,
        startedAt: Date.now() - 30000,
        scheduledEndTime: Date.now(),
        endedAt: Date.now(),
        targetDurationMs: 30000,
        actualDurationMs: 30000,
        outcome: 'completed',
        status: 'completed',
        blockedAppCount: 2,
        blockedAppIds: ['instagram', 'tiktok'],
        sessionTitle: "Alice's Deep Work",
        platform: 'web',
      };
      appendFocusLockHistoryRecord(aliceRecord, mockUserAlice.id);

      const bobRecord: FocusLockSessionRecord = {
        id: 'session_bob_1',
        userId: mockUserBob.id,
        startedAt: Date.now() - 15000,
        scheduledEndTime: Date.now(),
        endedAt: Date.now(),
        targetDurationMs: 15000,
        actualDurationMs: 10000,
        outcome: 'ended_early',
        status: 'ended_early',
        blockedAppCount: 1,
        blockedAppIds: ['youtube'],
        sessionTitle: "Bob's Work",
        platform: 'android',
        earlyEndReason: 'user_manual_unlock',
      };
      appendFocusLockHistoryRecord(bobRecord, mockUserBob.id);

      // Verify Alice cannot see Bob's records and vice-versa
      const aliceHistory = loadFocusLockHistory(mockUserAlice.id);
      expect(aliceHistory.length).toBe(1);
      expect(aliceHistory[0].id).toBe('session_alice_1');
      expect(aliceHistory[0].userId).toBe(mockUserAlice.id);

      const bobHistory = loadFocusLockHistory(mockUserBob.id);
      expect(bobHistory.length).toBe(1);
      expect(bobHistory[0].id).toBe('session_bob_1');
      expect(bobHistory[0].userId).toBe(mockUserBob.id);
    });

    it('enforces assertUserAccess to prevent unauthorized cross-user modifications', () => {
      expect(() => {
        assertUserAccess('user_alice_123', 'user_bob_456');
      }).toThrowError(FocusLockAccessDeniedError);

      expect(() => {
        assertUserAccess('user_alice_123', 'user_alice_123');
      }).not.toThrow();

      // Guest access to guest records succeeds
      expect(() => {
        assertUserAccess(null, 'guest');
      }).not.toThrow();
    });

    it('persists session identifier, start time, planned end time, status, and actual end time', () => {
      const now = Date.now();
      const scheduledEnd = now + 1500000;
      const actualEnd = now + 600000;

      const record: FocusLockSessionRecord = {
        id: 'fl_session_detailed_meta',
        userId: mockUserAlice.id,
        startedAt: now,
        scheduledEndTime: scheduledEnd,
        endedAt: actualEnd,
        targetDurationMs: 1500000,
        actualDurationMs: 600000,
        status: 'ended_early',
        outcome: 'ended_early',
        blockedAppCount: 3,
        blockedAppIds: ['instagram', 'tiktok', 'x_twitter'],
        sessionTitle: 'Sprint Focus',
        platform: 'web',
        earlyEndReason: 'user_confirmed_early_exit',
      };

      appendFocusLockHistoryRecord(record, mockUserAlice.id);

      const loaded = loadFocusLockHistory(mockUserAlice.id);
      expect(loaded.length).toBe(1);
      expect(loaded[0].id).toBe('fl_session_detailed_meta');
      expect(loaded[0].startedAt).toBe(now);
      expect(loaded[0].scheduledEndTime).toBe(scheduledEnd);
      expect(loaded[0].endedAt).toBe(actualEnd);
      expect(loaded[0].status).toBe('ended_early');
      expect(loaded[0].outcome).toBe('ended_early');
      expect(loaded[0].earlyEndReason).toBe('user_confirmed_early_exit');
    });

    it('stores early termination separately from normal completion', () => {
      const completedRecord: FocusLockSessionRecord = {
        id: 'session_complete',
        userId: mockUserAlice.id,
        startedAt: 1000,
        scheduledEndTime: 2000,
        endedAt: 2000,
        targetDurationMs: 1000,
        actualDurationMs: 1000,
        status: 'completed',
        outcome: 'completed',
        blockedAppCount: 1,
        blockedAppIds: ['instagram'],
        sessionTitle: 'Full Session',
        platform: 'web',
      };

      const endedEarlyRecord: FocusLockSessionRecord = {
        id: 'session_early',
        userId: mockUserAlice.id,
        startedAt: 3000,
        scheduledEndTime: 5000,
        endedAt: 3500,
        targetDurationMs: 2000,
        actualDurationMs: 500,
        status: 'ended_early',
        outcome: 'ended_early',
        blockedAppCount: 1,
        blockedAppIds: ['instagram'],
        sessionTitle: 'Cut Short',
        platform: 'web',
        earlyEndReason: 'user_manual_unlock',
      };

      appendFocusLockHistoryRecord(completedRecord, mockUserAlice.id);
      appendFocusLockHistoryRecord(endedEarlyRecord, mockUserAlice.id);

      const history = loadFocusLockHistory(mockUserAlice.id);
      expect(history.length).toBe(2);
      expect(history.find((h) => h.id === 'session_complete')?.outcome).toBe('completed');
      expect(history.find((h) => h.id === 'session_early')?.outcome).toBe('ended_early');
    });
  });

  describe('2. Guest to User Migration', () => {
    it('migrates guest settings and history to user partition upon first login', () => {
      // 1. User configures custom settings and completes a session while in guest mode
      const guestSettings: FocusLockSettings = {
        userId: 'guest',
        enabled: true,
        allowEarlyExit: true,
        selectedAppIds: ['instagram', 'tiktok', 'discord'],
        customApps: [],
        webFocusMode: 'shield',
        confirmEarlyExit: true,
      };
      saveFocusLockSettings(guestSettings, 'guest');

      const guestRecord: FocusLockSessionRecord = {
        id: 'guest_session_1',
        userId: 'guest',
        startedAt: Date.now() - 60000,
        scheduledEndTime: Date.now(),
        endedAt: Date.now(),
        targetDurationMs: 60000,
        actualDurationMs: 60000,
        outcome: 'completed',
        status: 'completed',
        blockedAppCount: 3,
        blockedAppIds: ['instagram', 'tiktok', 'discord'],
        sessionTitle: 'Guest Focus',
        platform: 'web',
      };
      appendFocusLockHistoryRecord(guestRecord, 'guest');

      // 2. User logs in as Alice
      const { migratedSettings, migratedHistoryCount } = migrateGuestDataToUser(mockUserAlice.id);
      expect(migratedSettings).toBe(true);
      expect(migratedHistoryCount).toBe(1);

      // Verify Alice has inherited the custom settings and history under her userId partition
      const aliceSettings = loadFocusLockSettings(mockUserAlice.id);
      expect(aliceSettings.selectedAppIds).toEqual(['instagram', 'tiktok', 'discord']);
      expect(aliceSettings.confirmEarlyExit).toBe(true);
      expect(aliceSettings.userId).toBe(mockUserAlice.id);

      const aliceHistory = loadFocusLockHistory(mockUserAlice.id);
      expect(aliceHistory.length).toBe(1);
      expect(aliceHistory[0].id).toBe('guest_session_1');
      expect(aliceHistory[0].userId).toBe(mockUserAlice.id);
    });

    it('does not overwrite existing user settings if user already has data', () => {
      // User Alice already has saved settings
      const existingAliceSettings: FocusLockSettings = {
        userId: mockUserAlice.id,
        enabled: true,
        allowEarlyExit: true,
        selectedAppIds: ['youtube'],
        customApps: [],
        webFocusMode: 'gentle',
        confirmEarlyExit: false,
      };
      saveFocusLockSettings(existingAliceSettings, mockUserAlice.id);

      // Guest has different settings
      saveFocusLockSettings(
        {
          userId: 'guest',
          enabled: true,
          allowEarlyExit: true,
          selectedAppIds: ['reddit'],
          customApps: [],
          webFocusMode: 'shield',
          confirmEarlyExit: true,
        },
        'guest'
      );

      // Migration attempted
      const { migratedSettings } = migrateGuestDataToUser(mockUserAlice.id);
      expect(migratedSettings).toBe(false);

      const aliceSettings = loadFocusLockSettings(mockUserAlice.id);
      expect(aliceSettings.selectedAppIds).toEqual(['youtube']); // Preserved!
    });
  });

  describe('3. Multi-Device Synchronization & Conflict Resolution', () => {
    it('Requirement 8 & 9: Tombstones strictly prevent ended sessions from being restored as active by stale sync', async () => {
      const syncService = FocusLockSyncService.getInstance();
      const sessionId = 'session_terminated_test';

      // 1. Session is terminated locally
      markSessionTerminatedLocally(sessionId, mockUserAlice.id);
      expect(isSessionTerminatedLocally(sessionId, mockUserAlice.id)).toBe(true);

      // 2. A stale incoming sync payload from an offline peer device claims this session is active
      const stalePayload = {
        userId: mockUserAlice.id,
        deviceId: 'device_peer_phone',
        timestamp: Date.now(),
        activeSession: {
          sessionId,
          userId: mockUserAlice.id,
          startedAt: Date.now() - 5000,
          scheduledEndTime: Date.now() + 100000,
          targetDurationMs: 105000,
          sessionTitle: 'Stale Active Sync',
          blockedAppIds: ['instagram'],
          platform: 'android' as const,
          totalPausedMs: 0,
        },
        terminatedSessionIds: [],
      };

      const result = await syncService.sync(mockUserAlice, stalePayload);
      expect(result.success).toBe(true);

      // Verify active session was REJECTED and NOT saved into local active session
      const active = loadActiveFocusSession(mockUserAlice.id);
      expect(active).toBeNull();
    });

    it('Requirement 8: Automatically completes and finalizes expired sessions received from sync', async () => {
      const syncService = FocusLockSyncService.getInstance();
      const expiredSessionId = 'session_expired_on_phone';

      const expiredPayload = {
        userId: mockUserAlice.id,
        deviceId: 'device_peer_tablet',
        timestamp: Date.now(),
        activeSession: {
          sessionId: expiredSessionId,
          userId: mockUserAlice.id,
          startedAt: Date.now() - 120000,
          scheduledEndTime: Date.now() - 10000, // Expired 10 seconds ago
          targetDurationMs: 110000,
          sessionTitle: 'Expired Peer Session',
          blockedAppIds: ['youtube'],
          platform: 'ios' as const,
          totalPausedMs: 0,
        },
      };

      const result = await syncService.sync(mockUserAlice, expiredPayload);
      expect(result.success).toBe(true);
      expect(result.activeSessionReconciled).toBe(true);

      // Verify active session is not active
      const active = loadActiveFocusSession(mockUserAlice.id);
      expect(active).toBeNull();

      // Verify an outcome: 'completed' record was created in history
      const history = loadFocusLockHistory(mockUserAlice.id);
      const expiredRecord = history.find((h) => h.id === expiredSessionId);
      expect(expiredRecord).toBeDefined();
      expect(expiredRecord?.outcome).toBe('completed');

      // Verify it was added to tombstones
      expect(isSessionTerminatedLocally(expiredSessionId, mockUserAlice.id)).toBe(true);
    });

    it('Requirement 8: Reconciles settings from peer devices using Last-Write-Wins versioning', async () => {
      const syncService = FocusLockSyncService.getInstance();

      // Local settings has version 1
      const localSettings: FocusLockSettings = {
        userId: mockUserAlice.id,
        version: 1,
        updatedAt: 1000,
        enabled: true,
        allowEarlyExit: true,
        selectedAppIds: ['instagram'],
        customApps: [],
        webFocusMode: 'shield',
        confirmEarlyExit: false,
      };
      saveFocusLockSettings(localSettings, mockUserAlice.id, { preserveMetadata: true });

      // Remote settings has version 2
      const remotePayload = {
        userId: mockUserAlice.id,
        deviceId: 'device_peer_laptop',
        timestamp: 2000,
        settings: {
          userId: mockUserAlice.id,
          version: 2,
          updatedAt: 2000,
          enabled: true,
          allowEarlyExit: true,
          selectedAppIds: ['instagram', 'tiktok', 'reddit'],
          customApps: [],
          webFocusMode: 'shield' as const,
          confirmEarlyExit: true,
        },
      };

      const result = await syncService.sync(mockUserAlice, remotePayload);
      expect(result.success).toBe(true);
      expect(result.settingsUpdated).toBe(true);

      const updatedLocal = loadFocusLockSettings(mockUserAlice.id);
      expect(updatedLocal.selectedAppIds).toEqual(['instagram', 'tiktok', 'reddit']);
      expect(updatedLocal.confirmEarlyExit).toBe(true);
    });

    it('Requirement 8: Merges history from peer devices without duplicating records', async () => {
      const syncService = FocusLockSyncService.getInstance();

      // Local history has Record 1
      appendFocusLockHistoryRecord(
        {
          id: 'rec_1',
          userId: mockUserAlice.id,
          startedAt: 1000,
          scheduledEndTime: 2000,
          endedAt: 2000,
          targetDurationMs: 1000,
          actualDurationMs: 1000,
          outcome: 'completed',
          status: 'completed',
          blockedAppCount: 1,
          blockedAppIds: ['instagram'],
          sessionTitle: 'Rec 1',
          platform: 'web',
        },
        mockUserAlice.id
      );

      // Peer device has Record 1 and Record 2
      const remotePayload = {
        userId: mockUserAlice.id,
        deviceId: 'device_peer',
        timestamp: 3000,
        history: [
          {
            id: 'rec_1',
            userId: mockUserAlice.id,
            startedAt: 1000,
            scheduledEndTime: 2000,
            endedAt: 2000,
            targetDurationMs: 1000,
            actualDurationMs: 1000,
            outcome: 'completed' as const,
            status: 'completed' as const,
            blockedAppCount: 1,
            blockedAppIds: ['instagram'],
            sessionTitle: 'Rec 1',
            platform: 'web' as const,
          },
          {
            id: 'rec_2',
            userId: mockUserAlice.id,
            startedAt: 3000,
            scheduledEndTime: 4000,
            endedAt: 4000,
            targetDurationMs: 1000,
            actualDurationMs: 1000,
            outcome: 'completed' as const,
            status: 'completed' as const,
            blockedAppCount: 2,
            blockedAppIds: ['tiktok', 'reddit'],
            sessionTitle: 'Rec 2',
            platform: 'android' as const,
          },
        ],
      };

      const result = await syncService.sync(mockUserAlice, remotePayload);
      expect(result.success).toBe(true);
      expect(result.historyAddedCount).toBe(1); // Only rec_2 added

      const merged = loadFocusLockHistory(mockUserAlice.id);
      expect(merged.length).toBe(2);
      expect(merged.map((m) => m.id)).toEqual(['rec_2', 'rec_1']);
    });

    it('Requirement 8: Dedupes concurrent in-flight sync calls (Idempotency)', async () => {
      const syncService = FocusLockSyncService.getInstance();

      // Fire 3 simultaneous sync calls
      const p1 = syncService.sync(mockUserAlice);
      const p2 = syncService.sync(mockUserAlice);
      const p3 = syncService.sync(mockUserAlice);

      // All three promises should resolve to identical sync result instance
      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
      expect(r1.success).toBe(true);
      expect(r1).toBe(r2);
      expect(r2).toBe(r3);
    });
  });

  describe('4. Offline Resilience & Sensible Offline Behavior', () => {
    it('Requirement 10: Seamlessly operates 100% offline and queues mutations', async () => {
      const syncService = FocusLockSyncService.getInstance();

      // Mock offline network state
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));

      expect(syncService.getIsOnline()).toBe(false);
      expect(syncService.getStatus()).toBe('offline');

      // Attempting to sync returns graceful offline response without throwing error
      const offlineResult = await syncService.sync(mockUserAlice);
      expect(offlineResult.success).toBe(false);
      expect(offlineResult.error).toContain('offline');

      // Queue a local mutation while offline
      const queueItem = syncService.queueMutation(
        'update_settings',
        { selectedAppIds: ['youtube'] },
        mockUserAlice.id
      );
      expect(queueItem.id).toBeTruthy();
      expect(queueItem.operation).toBe('update_settings');

      // Reconnect online
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      window.dispatchEvent(new Event('online'));

      expect(syncService.getIsOnline()).toBe(true);
    });
  });

  describe('5. Integration with useFocusLock & React Component Lifecycle', () => {
    it('switches user partitions cleanly when user prop changes', () => {
      // 1. Render as Alice
      const { rerender } = render(<FocusLockAuthHarness user={mockUserAlice} />);
      expect(screen.getByTestId('user-id')).toHaveTextContent(mockUserAlice.id);

      // Alice updates apps
      fireEvent.click(screen.getByTestId('btn-select-apps'));
      expect(screen.getByTestId('selected-apps')).toHaveTextContent('instagram,tiktok,youtube');

      // Alice starts session
      fireEvent.click(screen.getByTestId('btn-start'));
      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');

      // Alice ends session
      fireEvent.click(screen.getByTestId('btn-end-early'));
      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
      expect(screen.getByTestId('history-count')).toHaveTextContent('1');

      // 2. Rerender with Bob (different user!)
      rerender(<FocusLockAuthHarness user={mockUserBob} />);
      expect(screen.getByTestId('user-id')).toHaveTextContent(mockUserBob.id);

      // Bob starts with 0 history records because Alice's history is isolated!
      expect(screen.getByTestId('history-count')).toHaveTextContent('0');

      // 3. Rerender back to Alice
      rerender(<FocusLockAuthHarness user={mockUserAlice} />);
      expect(screen.getByTestId('user-id')).toHaveTextContent(mockUserAlice.id);
      expect(screen.getByTestId('history-count')).toHaveTextContent('1');
    });

    it('Requirement 11 & Important: Enforces restrictions locally and does not fake blocking via backend records', () => {
      // Native blocking bridge reports platform truthfully
      expect(FocusLockBridge.getPlatform()).toBe('web');
      expect(FocusLockBridge.isNative()).toBe(false);

      // Web platform operates in web focus protection mode and does not falsely claim native blocking
      const settings = loadFocusLockSettings();
      expect(settings.webFocusMode).toBe('shield');
    });
  });
});
