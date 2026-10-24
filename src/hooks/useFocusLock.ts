import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthUser } from '../types/auth';
import type {
  ActiveFocusLockSession,
  AppCategory,
  DistractingApp,
  FocusLockSessionRecord,
  FocusLockSettings,
  FocusLockStatus,
  FocusLockSyncResult,
  FocusLockSyncStatus,
} from '../types/focusLock';
import { DEFAULT_FOCUS_DURATION_MS } from '../types/focusLock';
import {
  loadFocusLockSettings,
  saveFocusLockSettings,
  getAllAvailableApps,
  loadActiveFocusSession,
  saveActiveFocusSession,
  clearActiveFocusSession,
  markSessionTerminatedLocally,
  isSessionTerminatedLocally,
  loadFocusLockHistory,
  appendFocusLockHistoryRecord,
  clearFocusLockHistory as clearHistoryStorage,
  calculateAuthoritativeRemainingMs,
  migrateGuestDataToUser,
} from '../utils/focusLockStorage';
import {
  FocusLockBridge,
  type AndroidPermissionStatus,
} from '../services/focusLock/FocusLockBridge';
import { FocusLockSyncService } from '../services/focusLock/FocusLockSyncService';
import { formatMilliseconds } from './useTimer';

export interface UseFocusLockOptions {
  user?: AuthUser | null;
  onManualEndSession?: () => void;
  onSessionComplete?: () => void;
}

export interface UseFocusLockReturn {
  // Settings & App Configuration
  settings: FocusLockSettings;
  updateSettings: (newSettings: FocusLockSettings) => void;
  availableApps: DistractingApp[];
  selectedAppIds: string[];
  selectedAppsCount: number;
  toggleApp: (appId: string) => void;
  selectAllApps: (appIds?: string[]) => void;
  deselectAllApps: () => void;
  selectCategory: (category: AppCategory) => void;
  addCustomApp: (name: string, category?: AppCategory, packageName?: string) => void;
  removeCustomApp: (appId: string) => void;

  // Session State
  status: FocusLockStatus;
  isActive: boolean;
  isLocked: boolean;
  sessionId: string | null;
  lockStartTime: number | null; // backward compatibility alias for startedAt
  startedAt: number | null;
  scheduledEndTime: number | null;
  targetDurationMs: number;
  remainingMs: number;
  formattedRemaining: { minutes: string; seconds: string; display: string };
  unlockError: string | null;
  isUnlocking: boolean;

  // Lifecycle Methods
  startSessionLock: (durationMs?: number, sessionTitle?: string, customSessionId?: string) => Promise<boolean>;
  pauseSessionLock: () => void;
  resumeSessionLock: () => void;
  endSessionLock: (reason?: string | unknown) => Promise<boolean>;
  completeSessionLock: () => Promise<boolean>;
  retryDeactivation: () => Promise<boolean>;

  // History
  sessionHistory: FocusLockSessionRecord[];
  clearHistory: () => void;

  // Modals & UI Controls
  isConfigModalOpen: boolean;
  openConfigModal: () => void;
  closeConfigModal: () => void;
  isEndEarlyModalOpen: boolean;
  openEndEarlyModal: () => void;
  closeEndEarlyModal: () => void;
  confirmEndEarly: () => Promise<boolean>;

  // Platform capabilities & Permissions
  platform: 'web' | 'android' | 'ios';
  isNativeBlockingAvailable: boolean;
  androidPermissions: AndroidPermissionStatus | null;
  requestAccessibilityPermission: () => Promise<boolean>;
  requestBatteryExemption: () => Promise<boolean>;
  refreshPermissions: () => Promise<void>;
  selectIosAppsWithFamilyPicker: () => Promise<void>;
  iosActivitySummary: { applicationCount: number; categoryCount: number; totalSelected: number } | null;

  // Authentication & Cloud Sync
  effectiveUserId: string;
  syncStatus: FocusLockSyncStatus;
  isOnline: boolean;
  syncFocusLock: () => Promise<FocusLockSyncResult>;
}

function getInitialFocusState(userId: string) {
  const session = loadActiveFocusSession(userId);
  if (!session || isSessionTerminatedLocally(session.sessionId, userId)) {
    if (session) {
      clearActiveFocusSession(userId);
    }
    return {
      session: null,
      status: 'idle' as FocusLockStatus,
      sessionId: null,
      isLocked: false,
      startedAt: null,
      scheduledEndTime: null,
      targetDurationMs: 0,
      remainingMs: 0,
      sessionTitle: 'Deep Work Session',
    };
  }

  const now = Date.now();
  const left = calculateAuthoritativeRemainingMs(session, now);
  if (left <= 0) {
    // Expired while app was closed/tab was inactive -> record completed session and unlock
    const start = session.startedAt;
    const actualDuration = Math.max(0, session.scheduledEndTime - start);
    const record: FocusLockSessionRecord = {
      id: session.sessionId,
      userId,
      startedAt: start,
      scheduledEndTime: session.scheduledEndTime,
      endedAt: session.scheduledEndTime,
      targetDurationMs: session.targetDurationMs,
      actualDurationMs: actualDuration,
      outcome: 'completed',
      status: 'completed',
      blockedAppCount: session.blockedAppIds.length,
      blockedAppIds: session.blockedAppIds,
      sessionTitle: session.sessionTitle,
      platform: session.platform,
    };

    markSessionTerminatedLocally(session.sessionId, userId);
    appendFocusLockHistoryRecord(record, userId);
    clearActiveFocusSession(userId);

    if (FocusLockBridge.isNative()) {
      FocusLockBridge.stopNativeLock('timer_completed');
    }

    return {
      session: null,
      status: 'completed' as FocusLockStatus,
      sessionId: null,
      isLocked: false,
      startedAt: null,
      scheduledEndTime: null,
      targetDurationMs: 0,
      remainingMs: 0,
      sessionTitle: session.sessionTitle,
    };
  }

  return {
    session,
    status: (session.pausedAt ? 'paused' : 'active') as FocusLockStatus,
    sessionId: session.sessionId,
    isLocked: true,
    startedAt: session.startedAt,
    scheduledEndTime: session.scheduledEndTime,
    targetDurationMs: session.targetDurationMs,
    remainingMs: left,
    sessionTitle: session.sessionTitle,
  };
}

export function useFocusLock(options: UseFocusLockOptions = {}): UseFocusLockReturn {
  const { user, onManualEndSession, onSessionComplete } = options;
  const effectiveUserId = (user?.id || 'guest').trim();

  const [initialState] = useState(() => getInitialFocusState(effectiveUserId));

  const [settings, setSettings] = useState<FocusLockSettings>(() => loadFocusLockSettings(effectiveUserId));
  const [status, setStatus] = useState<FocusLockStatus>(initialState.status);
  const [sessionId, setSessionId] = useState<string | null>(initialState.sessionId);
  const [isLocked, setIsLocked] = useState(initialState.isLocked);
  const [startedAt, setStartedAt] = useState<number | null>(initialState.startedAt);
  const [scheduledEndTime, setScheduledEndTime] = useState<number | null>(initialState.scheduledEndTime);
  const [targetDurationMs, setTargetDurationMs] = useState<number>(initialState.targetDurationMs);
  const [remainingMs, setRemainingMs] = useState<number>(initialState.remainingMs);
  const [sessionTitle, setSessionTitle] = useState<string>(initialState.sessionTitle);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const [sessionHistory, setSessionHistory] = useState<FocusLockSessionRecord[]>(() =>
    loadFocusLockHistory(effectiveUserId)
  );

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isEndEarlyModalOpen, setIsEndEarlyModalOpen] = useState(false);
  const [androidInstalledApps, setAndroidInstalledApps] = useState<DistractingApp[]>([]);
  const [androidPermissions, setAndroidPermissions] = useState<AndroidPermissionStatus | null>(null);
  const [iosActivitySummary, setIosActivitySummary] = useState<{
    applicationCount: number;
    categoryCount: number;
    totalSelected: number;
  } | null>(null);

  // Synchronization observables
  const [syncStatus, setSyncStatus] = useState<FocusLockSyncStatus>(() =>
    FocusLockSyncService.getInstance().getStatus()
  );
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    FocusLockSyncService.getInstance().getIsOnline()
  );

  // Synchronization refs to prevent race conditions, stale closures, and duplicate requests
  const isTransitioningRef = useRef<boolean>(false);
  const activeSessionRef = useRef<ActiveFocusLockSession | null>(initialState.session);
  const monotonicStartRef = useRef<number>(0);
  const monotonicEndTimeRef = useRef<number>(0);
  const activeUserRef = useRef<string>(effectiveUserId);

  // Synchronize state derived from user during render
  const [prevUserId, setPrevUserId] = useState(effectiveUserId);
  if (effectiveUserId !== prevUserId) {
    setPrevUserId(effectiveUserId);
    if (user?.id && user.id !== 'guest') {
      migrateGuestDataToUser(user.id);
    }
    setSettings(loadFocusLockSettings(effectiveUserId));
    setSessionHistory(loadFocusLockHistory(effectiveUserId));

    const nextState = getInitialFocusState(effectiveUserId);
    setStatus(nextState.status);
    setSessionId(nextState.sessionId);
    setIsLocked(nextState.isLocked);
    setStartedAt(nextState.startedAt);
    setScheduledEndTime(nextState.scheduledEndTime);
    setTargetDurationMs(nextState.targetDurationMs);
    setRemainingMs(nextState.remainingMs);
    setSessionTitle(nextState.sessionTitle);
  }

  // Platform capability detection
  const platform: 'web' | 'android' | 'ios' = useMemo(() => {
    return FocusLockBridge.getPlatform();
  }, []);

  const isNativeBlockingAvailable = platform === 'android' || platform === 'ios';

  // Subscribe to sync service status changes
  useEffect(() => {
    const syncService = FocusLockSyncService.getInstance();
    const unsubscribe = syncService.subscribeStatus((newStatus) => {
      setSyncStatus(newStatus);
      setIsOnline(syncService.getIsOnline());
    });
    return unsubscribe;
  }, []);

  // Update activeUserRef and activeSessionRef whenever user changes
  useEffect(() => {
    activeUserRef.current = effectiveUserId;
    activeSessionRef.current = getInitialFocusState(effectiveUserId).session;
  }, [effectiveUserId]);

  // Persist settings whenever updated
  const updateSettings = useCallback((newSettings: FocusLockSettings) => {
    const uid = activeUserRef.current;
    const enriched = { ...newSettings, userId: uid };
    setSettings(enriched);
    saveFocusLockSettings(enriched, uid);
    FocusLockSyncService.getInstance().queueMutation('update_settings', { settings: enriched }, uid);
  }, []);

  const availableApps = useMemo(() => {
    const baseApps = getAllAvailableApps(settings.customApps);
    if (androidInstalledApps.length === 0) {
      return baseApps;
    }
    const map = new Map<string, DistractingApp>();
    baseApps.forEach((a) => map.set(a.id, a));
    androidInstalledApps.forEach((a) => map.set(a.id, a));
    return Array.from(map.values());
  }, [androidInstalledApps, settings.customApps]);

  const selectedAppIds = settings.selectedAppIds;
  const selectedAppsCount = selectedAppIds.length;

  const refreshPermissions = useCallback(async () => {
    if (FocusLockBridge.isNative()) {
      const permStatus = await FocusLockBridge.getPermissionStatus();
      setAndroidPermissions(permStatus);
    }
  }, []);

  const requestAccessibilityPermission = useCallback(async () => {
    const opened = await FocusLockBridge.requestAccessibility();
    setTimeout(refreshPermissions, 1000);
    return opened;
  }, [refreshPermissions]);

  const requestBatteryExemption = useCallback(async () => {
    const opened = await FocusLockBridge.requestBatteryExemption();
    setTimeout(refreshPermissions, 1000);
    return opened;
  }, [refreshPermissions]);

  // Load installed apps and permissions on mount
  useEffect(() => {
    let isMounted = true;
    if (FocusLockBridge.isNative()) {
      FocusLockBridge.getPermissionStatus().then((permStatus) => {
        if (isMounted && permStatus) {
          setAndroidPermissions(permStatus);
        }
      });
      FocusLockBridge.fetchInstalledApps().then((apps) => {
        if (isMounted && apps && apps.length > 0) {
          setAndroidInstalledApps(apps);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // App Selection Handlers
  const toggleApp = useCallback(
    (appId: string) => {
      const exists = settings.selectedAppIds.includes(appId);
      const nextIds = exists
        ? settings.selectedAppIds.filter((id) => id !== appId)
        : [...settings.selectedAppIds, appId];

      updateSettings({
        ...settings,
        selectedAppIds: nextIds,
      });
    },
    [settings, updateSettings]
  );

  const selectAllApps = useCallback(
    (idsToSelect?: string[]) => {
      const allIds = idsToSelect || availableApps.map((a) => a.id);
      updateSettings({
        ...settings,
        selectedAppIds: Array.from(new Set([...settings.selectedAppIds, ...allIds])),
      });
    },
    [availableApps, settings, updateSettings]
  );

  const deselectAllApps = useCallback(() => {
    updateSettings({
      ...settings,
      selectedAppIds: [],
    });
  }, [settings, updateSettings]);

  const selectCategory = useCallback(
    (category: AppCategory) => {
      const categoryAppIds = availableApps
        .filter((app) => app.category === category)
        .map((app) => app.id);

      const allCategorySelected = categoryAppIds.every((id) =>
        settings.selectedAppIds.includes(id)
      );

      const nextIds = allCategorySelected
        ? settings.selectedAppIds.filter((id) => !categoryAppIds.includes(id))
        : Array.from(new Set([...settings.selectedAppIds, ...categoryAppIds]));

      updateSettings({
        ...settings,
        selectedAppIds: nextIds,
      });
    },
    [availableApps, settings, updateSettings]
  );

  const addCustomApp = useCallback(
    (name: string, category: AppCategory = 'custom', packageName?: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;

      const id = `custom_${Date.now()}_${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const newApp: DistractingApp = {
        id,
        name: trimmedName,
        category,
        packageNameAndroid: packageName?.trim() || undefined,
        bundleIdIos: packageName?.trim() || undefined,
        isCustom: true,
      };

      updateSettings({
        ...settings,
        customApps: [...settings.customApps, newApp],
        selectedAppIds: [...settings.selectedAppIds, id],
      });
    },
    [settings, updateSettings]
  );

  const selectIosAppsWithFamilyPicker = useCallback(async () => {
    if (platform !== 'ios') return;
    try {
      const res = await FocusLockBridge.presentIosAppPicker();
      if (res.success) {
        setIosActivitySummary({
          applicationCount: res.applicationCount,
          categoryCount: res.categoryCount,
          totalSelected: res.totalSelected,
        });
      } else if (res.error) {
        setUnlockError(res.error);
      }
    } catch (e) {
      console.warn('iOS FamilyPicker error:', e);
    }
  }, [platform]);

  const removeCustomApp = useCallback(
    (appId: string) => {
      updateSettings({
        ...settings,
        customApps: settings.customApps.filter((app) => app.id !== appId),
        selectedAppIds: settings.selectedAppIds.filter((id) => id !== appId),
      });
    },
    [settings, updateSettings]
  );

  // =========================================================================
  // CORE LIFECYCLE: START, PAUSE, RESUME, COMPLETE, END EARLY, RETRY
  // =========================================================================

  /**
   * 1. Start Session Lock
   * Engages restriction mechanisms, creates authoritative session state, and persists for crash recovery.
   */
  const startSessionLock = useCallback(
    async (
      durationMs: number = DEFAULT_FOCUS_DURATION_MS,
      title: string = 'Deep Work Session',
      customSessionId?: string
    ): Promise<boolean> => {
      const uid = activeUserRef.current;
      // Guard: already active or disabled
      if (!settings.enabled || settings.selectedAppIds.length === 0) {
        return false;
      }
      if (isTransitioningRef.current) {
        return false;
      }

      // Check required platform authorization before starting
      if (platform === 'android' && androidPermissions && !androidPermissions.hasAccessibility) {
        setUnlockError('Accessibility Service must be enabled in Android settings to restrict apps.');
        return false;
      }
      if (platform === 'ios' && androidPermissions && !androidPermissions.allPermissionsGranted) {
        setUnlockError('Apple Screen Time (FamilyControls) authorization is required to restrict apps.');
        return false;
      }

      isTransitioningRef.current = true;
      setStatus('starting');
      setUnlockError(null);

      const newSessionId =
        customSessionId ||
        `fl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const now = Date.now();
      const endTime = now + Math.max(0, durationMs);

      // Record monotonic clock reference if performance.now is available
      const perfNow = typeof performance !== 'undefined' ? performance.now() : 0;
      monotonicStartRef.current = perfNow;
      monotonicEndTimeRef.current = perfNow + durationMs;

      const activeSession: ActiveFocusLockSession = {
        sessionId: newSessionId,
        userId: uid,
        startedAt: now,
        scheduledEndTime: endTime,
        targetDurationMs: durationMs,
        sessionTitle: title,
        blockedAppIds: [...settings.selectedAppIds],
        platform,
        pausedAt: null,
        totalPausedMs: 0,
        status: 'active',
      };

      activeSessionRef.current = activeSession;
      saveActiveFocusSession(activeSession, uid);

      FocusLockSyncService.getInstance().queueMutation(
        'start_session',
        {
          sessionId: newSessionId,
          durationMs,
          title,
          startedAt: now,
          scheduledEndTime: endTime,
        },
        uid
      );

      setSessionId(newSessionId);
      setStartedAt(now);
      setScheduledEndTime(endTime);
      setTargetDurationMs(durationMs);
      setRemainingMs(durationMs);
      setSessionTitle(title);
      setIsLocked(true);
      setStatus('active');

      // Call Native Bridge if on native platform
      let activationSuccess = true;
      if (FocusLockBridge.isNative()) {
        const activation = await FocusLockBridge.startNativeLock(
          durationMs,
          title,
          settings.selectedAppIds,
          newSessionId
        );
        activationSuccess = activation.success;
      }

      isTransitioningRef.current = false;
      return activationSuccess;
    },
    [platform, settings.enabled, settings.selectedAppIds, androidPermissions]
  );

  /**
   * 2. Pause Session Lock
   * Preserves session state and marks pause timestamp without unlocking apps.
   */
  const pauseSessionLock = useCallback(() => {
    const uid = activeUserRef.current;
    if (status !== 'active' || !activeSessionRef.current) {
      return;
    }

    const now = Date.now();
    activeSessionRef.current = {
      ...activeSessionRef.current,
      pausedAt: now,
      status: 'paused',
    };
    saveActiveFocusSession(activeSessionRef.current, uid);
    FocusLockSyncService.getInstance().queueMutation(
      'pause_session',
      { sessionId: activeSessionRef.current.sessionId, pausedAt: now },
      uid
    );
    setStatus('paused');
  }, [status]);

  /**
   * 3. Resume Session Lock
   * Recalculates authoritative deadline based on paused delta.
   */
  const resumeSessionLock = useCallback(() => {
    const uid = activeUserRef.current;
    if (status !== 'paused' || !activeSessionRef.current) {
      return;
    }

    const session = activeSessionRef.current;
    const now = Date.now();
    let pauseDelta = 0;
    if (session.pausedAt && session.pausedAt > 0) {
      pauseDelta = Math.max(0, now - session.pausedAt);
    }

    const nextScheduledEndTime = session.scheduledEndTime + pauseDelta;
    const nextTotalPaused = session.totalPausedMs + pauseDelta;

    const updatedSession: ActiveFocusLockSession = {
      ...session,
      scheduledEndTime: nextScheduledEndTime,
      totalPausedMs: nextTotalPaused,
      pausedAt: null,
      status: 'active',
    };

    activeSessionRef.current = updatedSession;
    saveActiveFocusSession(updatedSession, uid);

    FocusLockSyncService.getInstance().queueMutation(
      'resume_session',
      { sessionId: updatedSession.sessionId, scheduledEndTime: nextScheduledEndTime },
      uid
    );

    setScheduledEndTime(nextScheduledEndTime);
    if (monotonicEndTimeRef.current > 0) {
      monotonicEndTimeRef.current += pauseDelta;
    }

    setStatus('active');
  }, [status]);

  /**
   * 4. End Session Lock Early (User sovereignty)
   * Promptly deactivates all restrictions and records early termination.
   */
  const endSessionLock = useCallback(
    async (reason?: string | unknown): Promise<boolean> => {
      const uid = activeUserRef.current;
      const effectiveReason = typeof reason === 'string' ? reason : 'user_manual_unlock';

      // Guard against concurrent / duplicate taps
      if (isTransitioningRef.current) {
        return false;
      }

      // If already idle/completed and not in failed_unlock state, nothing to do
      if (status === 'idle' || status === 'ended_early' || status === 'completed') {
        return true;
      }

      isTransitioningRef.current = true;
      setIsUnlocking(true);
      setStatus('ending');

      const currentSession = activeSessionRef.current;
      const currentSessionId = currentSession?.sessionId || sessionId || `fl_${Date.now()}`;

      // Mark session as terminated locally to prevent stale background events from reviving it
      markSessionTerminatedLocally(currentSessionId, uid);

      let deactivationSuccess = true;
      let deactivationError: string | undefined;

      // Deactivate native restriction if running on native platform
      if (FocusLockBridge.isNative()) {
        const deactivation = await FocusLockBridge.stopNativeLock(effectiveReason);
        deactivationSuccess = deactivation.success;
        deactivationError = deactivation.error;
      }

      if (deactivationSuccess) {
        // Restrictions successfully lifted
        const now = Date.now();
        const start = currentSession?.startedAt || startedAt || now;
        const actualDuration = Math.max(0, now - start);

        const record: FocusLockSessionRecord = {
          id: currentSessionId,
          userId: uid,
          startedAt: start,
          scheduledEndTime: currentSession?.scheduledEndTime || scheduledEndTime || now,
          endedAt: now,
          targetDurationMs: currentSession?.targetDurationMs || targetDurationMs,
          actualDurationMs: actualDuration,
          outcome: 'ended_early',
          status: 'ended_early',
          blockedAppCount: currentSession?.blockedAppIds.length || selectedAppsCount,
          blockedAppIds: currentSession?.blockedAppIds || [...selectedAppIds],
          sessionTitle: currentSession?.sessionTitle || sessionTitle,
          platform,
          earlyEndReason: effectiveReason,
        };

        appendFocusLockHistoryRecord(record, uid);
        setSessionHistory((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);

        // Clear active session
        clearActiveFocusSession(uid);
        activeSessionRef.current = null;

        FocusLockSyncService.getInstance().queueMutation(
          'end_session_early',
          { sessionId: currentSessionId, reason: effectiveReason, endedAt: now },
          uid
        );

        setIsLocked(false);
        setRemainingMs(0);
        setStatus('ended_early');
        setUnlockError(null);
        setIsUnlocking(false);
        setIsEndEarlyModalOpen(false);

        // Only notify parent timer to reset if this was initiated from Focus Lock UI
        // to prevent ping-pong loops when timer itself resets or switches mode
        const isUserInitiated =
          effectiveReason === 'user_manual_unlock' ||
          effectiveReason === 'user_confirmed_early_exit' ||
          effectiveReason === 'ended_from_notification' ||
          effectiveReason === 'ended_from_shield' ||
          effectiveReason === 'ended_from_native_shield' ||
          effectiveReason === 'direct_manual';

        if (isUserInitiated) {
          onManualEndSession?.();
        }
        isTransitioningRef.current = false;
        return true;
      } else {
        // DEACTIVATION FAILED: NEVER falsely claim apps are unlocked
        const errorMsg =
          deactivationError ||
          'Failed to communicate with native lock service. Selected apps may still be restricted.';
        console.error('Focus Lock deactivation error:', errorMsg);

        setUnlockError(errorMsg);
        setIsLocked(true); // Keep locked indicator active
        setStatus('failed_unlock');
        setIsUnlocking(false);
        isTransitioningRef.current = false;
        return false;
      }
    },
    [
      onManualEndSession,
      platform,
      scheduledEndTime,
      selectedAppIds,
      selectedAppsCount,
      sessionId,
      sessionTitle,
      startedAt,
      status,
      targetDurationMs,
    ]
  );

  /**
   * 5. Natural Session Completion (Timer reached 0)
   */
  const completeSessionLock = useCallback(async (): Promise<boolean> => {
    const uid = activeUserRef.current;
    if (isTransitioningRef.current) return false;

    isTransitioningRef.current = true;
    const currentSession = activeSessionRef.current;
    const currentSessionId = currentSession?.sessionId || sessionId || `fl_${Date.now()}`;

    markSessionTerminatedLocally(currentSessionId, uid);
    if (FocusLockBridge.isNative()) {
      await FocusLockBridge.stopNativeLock('timer_completed');
    }

    const now = Date.now();
    const start = currentSession?.startedAt || startedAt || now;
    const actualDuration = Math.max(0, now - start);

    const record: FocusLockSessionRecord = {
      id: currentSessionId,
      userId: uid,
      startedAt: start,
      scheduledEndTime: currentSession?.scheduledEndTime || scheduledEndTime || now,
      endedAt: now,
      targetDurationMs: currentSession?.targetDurationMs || targetDurationMs,
      actualDurationMs: actualDuration,
      outcome: 'completed',
      status: 'completed',
      blockedAppCount: currentSession?.blockedAppIds.length || selectedAppsCount,
      blockedAppIds: currentSession?.blockedAppIds || [...selectedAppIds],
      sessionTitle: currentSession?.sessionTitle || sessionTitle,
      platform,
    };

    appendFocusLockHistoryRecord(record, uid);
    setSessionHistory((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);

    clearActiveFocusSession(uid);
    activeSessionRef.current = null;

    FocusLockSyncService.getInstance().queueMutation(
      'complete_session',
      { sessionId: currentSessionId, endedAt: now },
      uid
    );

    setIsLocked(false);
    setRemainingMs(0);
    setStatus('completed');
    setUnlockError(null);
    setIsEndEarlyModalOpen(false);

    onSessionComplete?.();
    isTransitioningRef.current = false;
    return true;
  }, [
    onSessionComplete,
    platform,
    scheduledEndTime,
    selectedAppIds,
    selectedAppsCount,
    sessionId,
    sessionTitle,
    startedAt,
    targetDurationMs,
  ]);

  /**
   * 6. Retry Failed Deactivation
   */
  const retryDeactivation = useCallback(async (): Promise<boolean> => {
    return endSessionLock('retry_after_failed_unlock');
  }, [endSessionLock]);

  // Modal Handlers
  const openConfigModal = useCallback(() => {
    refreshPermissions();
    setIsConfigModalOpen(true);
  }, [refreshPermissions]);
  const closeConfigModal = useCallback(() => setIsConfigModalOpen(false), []);

  const openEndEarlyModal = useCallback(() => {
    if (settings.confirmEarlyExit) {
      setIsEndEarlyModalOpen(true);
    } else {
      endSessionLock('user_manual_unlock');
    }
  }, [endSessionLock, settings.confirmEarlyExit]);

  const closeEndEarlyModal = useCallback(() => {
    if (!isUnlocking) {
      setIsEndEarlyModalOpen(false);
    }
  }, [isUnlocking]);

  const confirmEndEarly = useCallback(async (): Promise<boolean> => {
    return endSessionLock('user_confirmed_early_exit');
  }, [endSessionLock]);

  const clearHistory = useCallback(() => {
    const uid = activeUserRef.current;
    clearHistoryStorage(uid);
    setSessionHistory([]);
  }, []);

  const syncFocusLock = useCallback(async (): Promise<FocusLockSyncResult> => {
    return FocusLockSyncService.getInstance().sync(user);
  }, [user]);


  // =========================================================================
  // CLOCK TICKER & TIME-ZONE / CLOCK DRIFT RESILIENCE
  // =========================================================================
  useEffect(() => {
    if (status !== 'active' || !scheduledEndTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      let left = Math.max(0, scheduledEndTime - now);

      // Verify clock jump against monotonic clock if available
      if (
        monotonicEndTimeRef.current > 0 &&
        typeof performance !== 'undefined'
      ) {
        const perfNow = performance.now();
        const monotonicLeft = Math.max(0, monotonicEndTimeRef.current - perfNow);

        // If wall clock delta differs drastically (> 60 seconds) from monotonic progression
        // (e.g. manual clock change or timezone warp), trust the monotonic timer
        if (Math.abs(left - monotonicLeft) > 60000) {
          left = monotonicLeft;
        }
      }

      setRemainingMs(left);

      if (left <= 0) {
        completeSessionLock();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [completeSessionLock, scheduledEndTime, status]);

  // =========================================================================
  // CROSS-PLATFORM BACKGROUND SYNC (Notification / Shield Activity Sync)
  // =========================================================================
  useEffect(() => {
    const handleSync = async () => {
      if (!FocusLockBridge.isNative() || status !== 'active') return;

      const nativeStatus = await FocusLockBridge.getLockStatus();
      if (!nativeStatus) return;

      // If native side has deactivated restrictions (e.g. user tapped "End Session"
      // in Android notification or Focus Shield activity), synchronize web state immediately!
      if (!nativeStatus.isLocked && isLocked) {
        const reason = nativeStatus.endReason || 'ended_from_native_shield';
        endSessionLock(reason);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleSync();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [endSessionLock, isLocked, status]);

  const formattedRemaining = useMemo(() => formatMilliseconds(remainingMs), [remainingMs]);

  return {
    settings,
    updateSettings,
    availableApps,
    selectedAppIds,
    selectedAppsCount,
    toggleApp,
    selectAllApps,
    deselectAllApps,
    selectCategory,
    addCustomApp,
    removeCustomApp,

    status,
    isActive: status === 'active' || status === 'paused' || status === 'starting',
    isLocked,
    sessionId,
    lockStartTime: startedAt,
    startedAt,
    scheduledEndTime,
    targetDurationMs,
    remainingMs,
    formattedRemaining,
    unlockError,
    isUnlocking,

    startSessionLock,
    pauseSessionLock,
    resumeSessionLock,
    endSessionLock,
    completeSessionLock,
    retryDeactivation,

    sessionHistory,
    clearHistory,

    isConfigModalOpen,
    openConfigModal,
    closeConfigModal,
    isEndEarlyModalOpen,
    openEndEarlyModal,
    closeEndEarlyModal,
    confirmEndEarly,

    platform,
    isNativeBlockingAvailable,
    androidPermissions,
    requestAccessibilityPermission,
    requestBatteryExemption,
    refreshPermissions,
    selectIosAppsWithFamilyPicker,
    iosActivitySummary,

    effectiveUserId,
    syncStatus,
    isOnline,
    syncFocusLock,
  };
}
