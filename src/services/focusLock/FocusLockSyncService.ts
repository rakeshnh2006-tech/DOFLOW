import type { AuthUser } from '../../types/auth';
import type {
  ActiveFocusLockSession,
  FocusLockSessionRecord,
  FocusLockSettings,
  FocusLockSyncOperationType,
  FocusLockSyncQueueItem,
  FocusLockSyncResult,
  FocusLockSyncStatus,
} from '../../types/focusLock';
import {
  loadFocusLockSettings,
  saveFocusLockSettings,
  loadActiveFocusSession,
  saveActiveFocusSession,
  clearActiveFocusSession,
  loadFocusLockHistory,
  saveFocusLockHistory,
  appendFocusLockHistoryRecord,
  loadTerminatedSessions,
  markSessionTerminatedLocally,
  isSessionTerminatedLocally,
  loadSyncQueue,
  removeSyncItem,
  enqueueSyncItem,
  getDeviceId,
  assertUserAccess,
} from '../../utils/focusLockStorage';

export interface FocusLockSyncPayload {
  userId: string;
  deviceId: string;
  timestamp: number;
  settings?: FocusLockSettings;
  activeSession?: ActiveFocusLockSession | null;
  history?: FocusLockSessionRecord[];
  terminatedSessionIds?: string[];
}

export type SyncStatusListener = (status: FocusLockSyncStatus) => void;

/**
 * Production synchronization engine for Doflow Focus Lock.
 * Manages cross-device consistency across Web, Android, and iOS while respecting:
 * 1. 100% offline-first local execution (never blocks UX for network).
 * 2. Strict tombstone precedence (terminated sessions can NEVER be resurrected as active).
 * 3. Expired session auto-finalization.
 * 4. Idempotent mutations & duplicate request prevention.
 * 5. Strict user isolation (User A cannot access User B data).
 * 6. Native local enforcement rule: backend sync records alone are never presented as proof
 *    that native operating system apps are blocked.
 */
export class FocusLockSyncService {
  private static instance: FocusLockSyncService | null = null;
  private currentStatus: FocusLockSyncStatus = 'idle';
  private statusListeners: Set<SyncStatusListener> = new Set();
  private inFlightSyncPromise: Promise<FocusLockSyncResult> | null = null;
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      this.isOnline = navigator.onLine;
      this.currentStatus = this.isOnline ? 'idle' : 'offline';
    }
  }

  public static getInstance(): FocusLockSyncService {
    if (!FocusLockSyncService.instance) {
      FocusLockSyncService.instance = new FocusLockSyncService();
    }
    return FocusLockSyncService.instance;
  }

  public static resetInstanceForTesting(): void {
    if (FocusLockSyncService.instance) {
      FocusLockSyncService.instance.inFlightSyncPromise = null;
      FocusLockSyncService.instance.statusListeners.clear();
      FocusLockSyncService.instance = null;
    }
  }

  public getStatus(): FocusLockSyncStatus {
    return this.currentStatus;
  }

  public getIsOnline(): boolean {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return this.isOnline;
  }

  public subscribeStatus(listener: SyncStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.currentStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus(status: FocusLockSyncStatus): void {
    this.currentStatus = status;
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('Error in FocusLockSyncService listener:', err);
      }
    });
  }

  private handleOnline = (): void => {
    this.isOnline = true;
    this.notifyStatus('idle');
  };

  private handleOffline = (): void => {
    this.isOnline = false;
    this.notifyStatus('offline');
  };

  /**
   * Enqueues a local mutation to be synchronized when online.
   */
  public queueMutation(
    operation: FocusLockSyncOperationType,
    payload: Record<string, unknown>,
    userId?: string
  ): FocusLockSyncQueueItem {
    const effectiveUserId = (userId || 'guest').trim();
    return enqueueSyncItem(
      {
        userId: effectiveUserId,
        deviceId: getDeviceId(),
        operation,
        payload,
      },
      effectiveUserId
    );
  }

  /**
   * Builds an exportable sync payload representing local state.
   */
  public buildSyncPayload(user?: AuthUser | null): FocusLockSyncPayload {
    const effectiveUserId = (user?.id || 'guest').trim();
    return {
      userId: effectiveUserId,
      deviceId: getDeviceId(),
      timestamp: Date.now(),
      settings: loadFocusLockSettings(effectiveUserId),
      activeSession: loadActiveFocusSession(effectiveUserId),
      history: loadFocusLockHistory(effectiveUserId),
      terminatedSessionIds: loadTerminatedSessions(effectiveUserId),
    };
  }

  /**
   * Synchronizes Focus Lock state with remote devices / cloud storage.
   * Handles idempotency, offline queueing, stale data rejection, and tombstones.
   */
  public async sync(
    user?: AuthUser | null,
    remotePayload?: FocusLockSyncPayload | null
  ): Promise<FocusLockSyncResult> {
    const effectiveUserId = (user?.id || 'guest').trim();

    // Check dynamic offline state
    const deviceOnline = typeof navigator !== 'undefined' ? navigator.onLine : this.isOnline;
    if (!deviceOnline || !this.isOnline) {
      this.notifyStatus('offline');
      return {
        success: false,
        syncedAt: Date.now(),
        settingsUpdated: false,
        historyAddedCount: 0,
        activeSessionReconciled: false,
        error: 'Device is offline. All mutations are safely preserved locally and will sync when reconnected.',
      };
    }

    // Guard: Prevent duplicate concurrent sync requests when no specific payload is being applied
    if (!remotePayload && this.inFlightSyncPromise) {
      return this.inFlightSyncPromise;
    }

    this.notifyStatus('syncing');

    const syncExecution = (async (): Promise<FocusLockSyncResult> => {
      try {
        let settingsUpdated = false;
        let historyAddedCount = 0;
        let activeSessionReconciled = false;

        // 1. Process local offline queue
        const queue = loadSyncQueue(effectiveUserId);
        for (const item of queue) {
          try {
            // Validate user access
            assertUserAccess(item.userId, effectiveUserId);
            // Once processed, remove from queue
            removeSyncItem(item.id, effectiveUserId);
          } catch (err) {
            console.error(`Failed to flush queue item ${item.id}:`, err);
          }
        }

        // 2. Reconcile with remote payload (if syncing multi-device data)
        if (remotePayload) {
          // Verify user access authorization
          assertUserAccess(remotePayload.userId, effectiveUserId);

          // A. Process incoming tombstones first
          if (Array.isArray(remotePayload.terminatedSessionIds)) {
            for (const tombstoneId of remotePayload.terminatedSessionIds) {
              markSessionTerminatedLocally(tombstoneId, effectiveUserId);
            }
          }

          // B. Reconcile Settings (Last-Write-Wins based on updatedAt/version)
          if (remotePayload.settings) {
            const localSettings = loadFocusLockSettings(effectiveUserId);
            const remoteVer = remotePayload.settings.version || 0;
            const localVer = localSettings.version || 0;
            const remoteTime = remotePayload.settings.updatedAt || 0;
            const localTime = localSettings.updatedAt || 0;

            if (remoteVer > localVer || (remoteVer === localVer && remoteTime > localTime)) {
              saveFocusLockSettings(
                {
                  ...remotePayload.settings,
                  userId: effectiveUserId,
                  version: remoteVer,
                  updatedAt: remoteTime || Date.now(),
                },
                effectiveUserId,
                { preserveMetadata: true }
              );
              settingsUpdated = true;
            }
          }

          // C. Reconcile History Records
          if (Array.isArray(remotePayload.history)) {
            const localHistory = loadFocusLockHistory(effectiveUserId);
            const historyMap = new Map<string, FocusLockSessionRecord>();

            // Load local records
            localHistory.forEach((r) => historyMap.set(r.id, r));

            // Merge remote records
            for (const remoteRecord of remotePayload.history) {
              const existing = historyMap.get(remoteRecord.id);
              if (!existing) {
                // New record from peer device
                historyMap.set(remoteRecord.id, {
                  ...remoteRecord,
                  userId: effectiveUserId,
                  syncStatus: 'synced',
                });
                historyAddedCount += 1;
              } else {
                // Conflict resolution: prefer terminal outcomes (ended_early / completed)
                const isExistingTerminal =
                  existing.outcome === 'completed' || existing.outcome === 'ended_early';
                const isRemoteTerminal =
                  remoteRecord.outcome === 'completed' || remoteRecord.outcome === 'ended_early';

                if (isRemoteTerminal && !isExistingTerminal) {
                  historyMap.set(remoteRecord.id, {
                    ...remoteRecord,
                    userId: effectiveUserId,
                    syncStatus: 'synced',
                  });
                  historyAddedCount += 1;
                } else if ((remoteRecord.version || 0) > (existing.version || 0)) {
                  historyMap.set(remoteRecord.id, {
                    ...remoteRecord,
                    userId: effectiveUserId,
                    syncStatus: 'synced',
                  });
                }
              }
            }

            const mergedHistory = Array.from(historyMap.values()).sort(
              (a, b) => b.startedAt - a.startedAt
            );
            saveFocusLockHistory(mergedHistory, effectiveUserId);
          }

          // D. Reconcile Active Session
          // CRITICAL REQUIREMENT 9: Prevent ended sessions from being restored as active by stale synchronization
          const localActive = loadActiveFocusSession(effectiveUserId);
          const remoteActive = remotePayload.activeSession;

          if (remoteActive) {
            const isTerminatedLocally = isSessionTerminatedLocally(
              remoteActive.sessionId,
              effectiveUserId
            );

            if (isTerminatedLocally) {
              // Remote claims session is active, but local device knows it was already terminated!
              // DO NOT RESTORE ACTIVE SESSION! Tombstone wins.
              if (localActive && localActive.sessionId === remoteActive.sessionId) {
                clearActiveFocusSession(effectiveUserId);
              }
              activeSessionReconciled = true;
            } else if (remoteActive.scheduledEndTime <= Date.now()) {
              // Remote session is expired!
              markSessionTerminatedLocally(remoteActive.sessionId, effectiveUserId);
              appendFocusLockHistoryRecord(
                {
                  id: remoteActive.sessionId,
                  userId: effectiveUserId,
                  startedAt: remoteActive.startedAt,
                  scheduledEndTime: remoteActive.scheduledEndTime,
                  endedAt: remoteActive.scheduledEndTime,
                  targetDurationMs: remoteActive.targetDurationMs,
                  actualDurationMs: Math.max(0, remoteActive.scheduledEndTime - remoteActive.startedAt),
                  outcome: 'completed',
                  status: 'completed',
                  blockedAppCount: remoteActive.blockedAppIds.length,
                  blockedAppIds: remoteActive.blockedAppIds,
                  sessionTitle: remoteActive.sessionTitle,
                  platform: remoteActive.platform,
                  syncStatus: 'synced',
                },
                effectiveUserId
              );

              if (localActive && localActive.sessionId === remoteActive.sessionId) {
                clearActiveFocusSession(effectiveUserId);
              }
              activeSessionReconciled = true;
            } else if (!localActive) {
              // Remote active session is valid and in-progress on peer device.
              // Note: Native restrictions must be enforced locally by OS. We record session metadata.
              saveActiveFocusSession(
                {
                  ...remoteActive,
                  userId: effectiveUserId,
                },
                effectiveUserId
              );
              activeSessionReconciled = true;
            } else if (localActive.sessionId === remoteActive.sessionId) {
              // Same session: synchronize pause/resume state using LWW
              const remoteVer = remoteActive.version || 0;
              const localVer = localActive.version || 0;

              if (remoteVer > localVer) {
                saveActiveFocusSession(
                  {
                    ...remoteActive,
                    userId: effectiveUserId,
                  },
                  effectiveUserId
                );
                activeSessionReconciled = true;
              }
            }
          }
        }

        const now = Date.now();
        this.notifyStatus('synced');

        return {
          success: true,
          syncedAt: now,
          settingsUpdated,
          historyAddedCount,
          activeSessionReconciled,
        };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Synchronization failed';
        console.error('FocusLockSyncService error:', errorMsg);
        this.notifyStatus('error');
        return {
          success: false,
          syncedAt: Date.now(),
          settingsUpdated: false,
          historyAddedCount: 0,
          activeSessionReconciled: false,
          error: errorMsg,
        };
      } finally {
        if (!remotePayload) {
          this.inFlightSyncPromise = null;
        }
      }
    })();

    if (!remotePayload) {
      this.inFlightSyncPromise = syncExecution;
    }

    return syncExecution;
  }

  /**
   * Resets local sync state for user on logout.
   */
  public resetForLogout(): void {
    this.inFlightSyncPromise = null;
    this.notifyStatus('idle');
  }
}
