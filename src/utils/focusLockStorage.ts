import type {
  ActiveFocusLockSession,
  DistractingApp,
  FocusLockSessionRecord,
  FocusLockSettings,
  FocusLockSyncQueueItem,
} from '../types/focusLock';
import { DEFAULT_FOCUS_LOCK_SETTINGS, PRESET_DISTRACTING_APPS } from '../types/focusLock';

export const FOCUS_LOCK_STORAGE_KEY = 'doflow_focus_lock_settings';
export const FOCUS_LOCK_ACTIVE_SESSION_KEY = 'doflow_focus_lock_active_session';
export const FOCUS_LOCK_HISTORY_KEY = 'doflow_focus_lock_history';
export const FOCUS_LOCK_TERMINATED_SESSIONS_KEY = 'doflow_focus_lock_terminated_sessions';
export const FOCUS_LOCK_SYNC_QUEUE_KEY = 'doflow_focus_lock_sync_queue';
export const DOFLOW_DEVICE_ID_KEY = 'doflow_device_id';

const MAX_HISTORY_ITEMS = 200;
const MAX_TERMINATED_TOMBSTONES = 100;
const MAX_SYNC_QUEUE_ITEMS = 100;

export class FocusLockAccessDeniedError extends Error {
  constructor(message: string = 'Access denied: user not authorized to access this record') {
    super(message);
    this.name = 'FocusLockAccessDeniedError';
  }
}

/**
 * Validates that an operation requested by activeUserId matches the record's owning userId.
 * Prevents cross-user data leakage and unauthorized modifications.
 */
export function assertUserAccess(recordUserId?: string | null, activeUserId?: string | null): void {
  const recUser = (recordUserId || 'guest').trim();
  const actUser = (activeUserId || 'guest').trim();

  if (recUser && actUser && recUser !== actUser) {
    throw new FocusLockAccessDeniedError(
      `Access denied: User "${actUser}" cannot access or modify record belonging to "${recUser}"`
    );
  }
}

/**
 * Resolves user-partitioned localStorage key.
 * Defaults to '_guest' when no userId is authenticated.
 */
export function getUserStorageKey(baseKey: string, userId?: string | null): string {
  const normalized = (userId || '').trim();
  return normalized && normalized !== 'guest' ? `${baseKey}_${normalized}` : `${baseKey}_guest`;
}

/**
 * Retrieves or initializes a persistent, unique client device identifier.
 * Avoids colliding session broadcasts across multiple physical devices.
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'device_web_transient';
  }

  try {
    const existing = window.localStorage.getItem(DOFLOW_DEVICE_ID_KEY);
    if (existing && existing.trim().length > 0) {
      return existing.trim();
    }

    const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).substring(2, 10);
    const generated = `dev_${Date.now()}_${randomPart}`;
    window.localStorage.setItem(DOFLOW_DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return 'device_web_fallback';
  }
}

/**
 * Loads Focus Lock settings for the specified user with safe fallback to defaults.
 * Supports transparent migration from legacy un-suffixed storage for guest users.
 */
export function loadFocusLockSettings(userId?: string): FocusLockSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_FOCUS_LOCK_SETTINGS, userId: userId || 'guest' };
  }

  try {
    const scopedKey = getUserStorageKey(FOCUS_LOCK_STORAGE_KEY, userId);
    let raw = window.localStorage.getItem(scopedKey);

    // Fallback migration check for guest / unauthenticated users
    if (!raw && (!userId || userId === 'guest')) {
      const legacyRaw = window.localStorage.getItem(FOCUS_LOCK_STORAGE_KEY);
      if (legacyRaw) {
        raw = legacyRaw;
        // Transparently persist into the guest scoped key
        window.localStorage.setItem(scopedKey, legacyRaw);
      }
    }

    if (!raw) {
      return { ...DEFAULT_FOCUS_LOCK_SETTINGS, userId: userId || 'guest' };
    }

    const parsed = JSON.parse(raw) as Partial<FocusLockSettings>;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_FOCUS_LOCK_SETTINGS, userId: userId || 'guest' };
    }

    return {
      userId: parsed.userId || userId || 'guest',
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_FOCUS_LOCK_SETTINGS.enabled,
      allowEarlyExit: typeof parsed.allowEarlyExit === 'boolean' ? parsed.allowEarlyExit : true,
      selectedAppIds: Array.isArray(parsed.selectedAppIds) ? parsed.selectedAppIds : DEFAULT_FOCUS_LOCK_SETTINGS.selectedAppIds,
      customApps: Array.isArray(parsed.customApps) ? parsed.customApps : [],
      webFocusMode: parsed.webFocusMode === 'gentle' ? 'gentle' : 'shield',
      confirmEarlyExit: typeof parsed.confirmEarlyExit === 'boolean' ? parsed.confirmEarlyExit : false,
    };
  } catch (error) {
    console.error('Failed to load Focus Lock settings from localStorage:', error);
    return { ...DEFAULT_FOCUS_LOCK_SETTINGS, userId: userId || 'guest' };
  }
}

/**
 * Saves Focus Lock settings to localStorage partitioned by user.
 */
export function saveFocusLockSettings(
  settings: FocusLockSettings,
  userId?: string,
  options?: { preserveMetadata?: boolean }
): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const effectiveUserId = (userId || settings.userId || 'guest').trim();
  assertUserAccess(settings.userId, effectiveUserId);

  try {
    const updatedSettings: FocusLockSettings = {
      ...settings,
      userId: effectiveUserId,
      version:
        options?.preserveMetadata && typeof settings.version === 'number'
          ? settings.version
          : (settings.version || 0) + 1,
      updatedAt:
        options?.preserveMetadata && typeof settings.updatedAt === 'number'
          ? settings.updatedAt
          : Date.now(),
    };

    const scopedKey = getUserStorageKey(FOCUS_LOCK_STORAGE_KEY, effectiveUserId);
    window.localStorage.setItem(scopedKey, JSON.stringify(updatedSettings));

    // Also mirror to legacy key for guest to keep backward compatibility with external tools
    if (effectiveUserId === 'guest') {
      window.localStorage.setItem(FOCUS_LOCK_STORAGE_KEY, JSON.stringify(updatedSettings));
    }
  } catch (error) {
    console.error('Failed to save Focus Lock settings to localStorage:', error);
  }
}

/**
 * Loads active Focus Lock session if one is currently in-flight across tab reloads/crashes.
 * Handles automatic expiration and user isolation.
 */
export function loadActiveFocusSession(userId?: string): ActiveFocusLockSession | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const scopedKey = getUserStorageKey(FOCUS_LOCK_ACTIVE_SESSION_KEY, userId);
    let raw = window.localStorage.getItem(scopedKey);

    // Fallback migration check for guest
    if (!raw && (!userId || userId === 'guest')) {
      const legacyRaw = window.localStorage.getItem(FOCUS_LOCK_ACTIVE_SESSION_KEY);
      if (legacyRaw) {
        raw = legacyRaw;
      }
    }

    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ActiveFocusLockSession>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.startedAt !== 'number' ||
      typeof parsed.scheduledEndTime !== 'number'
    ) {
      return null;
    }

    // Access control: ensure session belongs to current user
    const effectiveUserId = userId || 'guest';
    if (parsed.userId && parsed.userId !== effectiveUserId) {
      return null;
    }

    // Strict Tombstone Precedence (Requirement 9):
    // If session was marked terminated, NEVER return as active!
    if (isSessionTerminatedLocally(parsed.sessionId, effectiveUserId)) {
      clearActiveFocusSession(userId);
      return null;
    }

    const session: ActiveFocusLockSession = {
      sessionId: parsed.sessionId,
      userId: parsed.userId || effectiveUserId,
      startedAt: parsed.startedAt,
      scheduledEndTime: parsed.scheduledEndTime,
      targetDurationMs: typeof parsed.targetDurationMs === 'number' ? parsed.targetDurationMs : 0,
      sessionTitle: typeof parsed.sessionTitle === 'string' ? parsed.sessionTitle : 'Focus Session',
      blockedAppIds: Array.isArray(parsed.blockedAppIds) ? parsed.blockedAppIds : [],
      platform: parsed.platform === 'android' || parsed.platform === 'ios' ? parsed.platform : 'web',
      pausedAt: typeof parsed.pausedAt === 'number' ? parsed.pausedAt : null,
      totalPausedMs: typeof parsed.totalPausedMs === 'number' ? parsed.totalPausedMs : 0,
      status: parsed.status || (parsed.pausedAt ? 'paused' : 'active'),
      deviceId: parsed.deviceId || getDeviceId(),
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };

    return session;
  } catch (error) {
    console.error('Failed to load active Focus Lock session from localStorage:', error);
    return null;
  }
}

/**
 * Saves the active session to localStorage for crash resilience and cross-tab/process sync.
 */
export function saveActiveFocusSession(session: ActiveFocusLockSession, userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const effectiveUserId = (userId || session.userId || 'guest').trim();
  assertUserAccess(session.userId, effectiveUserId);

  try {
    const updatedSession: ActiveFocusLockSession = {
      ...session,
      userId: effectiveUserId,
      deviceId: session.deviceId || getDeviceId(),
      version: (session.version || 0) + 1,
      updatedAt: Date.now(),
    };

    const scopedKey = getUserStorageKey(FOCUS_LOCK_ACTIVE_SESSION_KEY, effectiveUserId);
    window.localStorage.setItem(scopedKey, JSON.stringify(updatedSession));

    if (effectiveUserId === 'guest') {
      window.localStorage.setItem(FOCUS_LOCK_ACTIVE_SESSION_KEY, JSON.stringify(updatedSession));
    }
  } catch (error) {
    console.error('Failed to save active Focus Lock session to localStorage:', error);
  }
}

/**
 * Clears the active session from localStorage.
 */
export function clearActiveFocusSession(userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const scopedKey = getUserStorageKey(FOCUS_LOCK_ACTIVE_SESSION_KEY, userId);
    window.localStorage.removeItem(scopedKey);

    if (!userId || userId === 'guest') {
      window.localStorage.removeItem(FOCUS_LOCK_ACTIVE_SESSION_KEY);
    }
  } catch (error) {
    console.error('Failed to clear active Focus Lock session from localStorage:', error);
  }
}

/**
 * Loads all terminated session tombstones for the user.
 */
export function loadTerminatedSessions(userId?: string): string[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const scopedKey = getUserStorageKey(FOCUS_LOCK_TERMINATED_SESSIONS_KEY, userId);
    const raw = window.localStorage.getItem(scopedKey);
    let list: string[] = raw ? JSON.parse(raw) : [];

    // Also include legacy/global tombstones for extra safety
    const legacyRaw = window.localStorage.getItem(FOCUS_LOCK_TERMINATED_SESSIONS_KEY);
    if (legacyRaw) {
      const legacyList: string[] = JSON.parse(legacyRaw);
      if (Array.isArray(legacyList)) {
        list = Array.from(new Set([...list, ...legacyList]));
      }
    }

    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Records a session as explicitly terminated locally so stale server/background broadcasts
 * or offline peer devices cannot resurrect or re-lock it.
 */
export function markSessionTerminatedLocally(sessionId: string, userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !sessionId) {
    return;
  }

  try {
    const scopedKey = getUserStorageKey(FOCUS_LOCK_TERMINATED_SESSIONS_KEY, userId);
    const raw = window.localStorage.getItem(scopedKey);
    const set: string[] = raw ? JSON.parse(raw) : [];

    if (!set.includes(sessionId)) {
      set.unshift(sessionId);
      if (set.length > MAX_TERMINATED_TOMBSTONES) {
        set.length = MAX_TERMINATED_TOMBSTONES;
      }
      window.localStorage.setItem(scopedKey, JSON.stringify(set));
    }

    // Always mirror to root key to protect background services & receivers
    const legacyRaw = window.localStorage.getItem(FOCUS_LOCK_TERMINATED_SESSIONS_KEY);
    const legacySet: string[] = legacyRaw ? JSON.parse(legacyRaw) : [];
    if (!legacySet.includes(sessionId)) {
      legacySet.unshift(sessionId);
      if (legacySet.length > MAX_TERMINATED_TOMBSTONES) {
        legacySet.length = MAX_TERMINATED_TOMBSTONES;
      }
      window.localStorage.setItem(FOCUS_LOCK_TERMINATED_SESSIONS_KEY, JSON.stringify(legacySet));
    }
  } catch (error) {
    console.error('Failed to mark session terminated in localStorage:', error);
  }
}

/**
 * Checks whether a session ID was terminated locally by the user.
 */
export function isSessionTerminatedLocally(sessionId: string, userId?: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage || !sessionId) {
    return false;
  }

  try {
    const scopedKey = getUserStorageKey(FOCUS_LOCK_TERMINATED_SESSIONS_KEY, userId);
    const raw = window.localStorage.getItem(scopedKey);
    if (raw) {
      const set: string[] = JSON.parse(raw);
      if (Array.isArray(set) && set.includes(sessionId)) {
        return true;
      }
    }

    // Check fallback legacy key
    const legacyRaw = window.localStorage.getItem(FOCUS_LOCK_TERMINATED_SESSIONS_KEY);
    if (legacyRaw) {
      const legacySet: string[] = JSON.parse(legacyRaw);
      return Array.isArray(legacySet) && legacySet.includes(sessionId);
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Loads session history records partitioned by user.
 * Guarantees that only records belonging to the requested user are returned.
 */
export function loadFocusLockHistory(userId?: string): FocusLockSessionRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const effectiveUserId = (userId || 'guest').trim();
    const scopedKey = getUserStorageKey(FOCUS_LOCK_HISTORY_KEY, effectiveUserId);
    let raw = window.localStorage.getItem(scopedKey);

    // Fallback migration check for guest
    if (!raw && effectiveUserId === 'guest') {
      const legacyRaw = window.localStorage.getItem(FOCUS_LOCK_HISTORY_KEY);
      if (legacyRaw) {
        raw = legacyRaw;
      }
    }

    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Filter to ensure strict user isolation
    return parsed.filter((r) => {
      const recordUser = (r.userId || 'guest').trim();
      return recordUser === effectiveUserId;
    });
  } catch (error) {
    console.error('Failed to load Focus Lock history from localStorage:', error);
    return [];
  }
}

/**
 * Saves session history records with maximum cap.
 */
export function saveFocusLockHistory(history: FocusLockSessionRecord[], userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  const effectiveUserId = (userId || 'guest').trim();

  try {
    // Strict isolation: only save records for this user
    const scopedRecords = history
      .filter((r) => (r.userId || 'guest').trim() === effectiveUserId)
      .slice(0, MAX_HISTORY_ITEMS);

    const scopedKey = getUserStorageKey(FOCUS_LOCK_HISTORY_KEY, effectiveUserId);
    window.localStorage.setItem(scopedKey, JSON.stringify(scopedRecords));

    if (effectiveUserId === 'guest') {
      window.localStorage.setItem(FOCUS_LOCK_HISTORY_KEY, JSON.stringify(scopedRecords));
    }
  } catch (error) {
    console.error('Failed to save Focus Lock history to localStorage:', error);
  }
}

/**
 * Appends a new session record to history for the specified user.
 */
export function appendFocusLockHistoryRecord(
  record: FocusLockSessionRecord,
  userId?: string
): void {
  const effectiveUserId = (userId || record.userId || 'guest').trim();
  assertUserAccess(record.userId, effectiveUserId);

  const history = loadFocusLockHistory(effectiveUserId);
  const now = Date.now();

  const enrichedRecord: FocusLockSessionRecord = {
    ...record,
    userId: effectiveUserId,
    deviceId: record.deviceId || getDeviceId(),
    version: (record.version || 0) + 1,
    updatedAt: now,
    syncStatus: record.syncStatus || 'pending_sync',
    status: record.status || (record.outcome === 'completed' ? 'completed' : 'ended_early'),
  };

  // Filter out any duplicate record with same ID
  const filtered = history.filter((r) => r.id !== enrichedRecord.id);
  filtered.unshift(enrichedRecord);
  saveFocusLockHistory(filtered, effectiveUserId);
}

/**
 * Clears Focus Lock session history for the specified user only.
 */
export function clearFocusLockHistory(userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const effectiveUserId = (userId || 'guest').trim();
    const scopedKey = getUserStorageKey(FOCUS_LOCK_HISTORY_KEY, effectiveUserId);
    window.localStorage.removeItem(scopedKey);

    if (effectiveUserId === 'guest') {
      window.localStorage.removeItem(FOCUS_LOCK_HISTORY_KEY);
    }
  } catch (error) {
    console.error('Failed to clear Focus Lock history from localStorage:', error);
  }
}

/**
 * Loads pending offline synchronization queue.
 */
export function loadSyncQueue(userId?: string): FocusLockSyncQueueItem[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const scopedKey = getUserStorageKey(FOCUS_LOCK_SYNC_QUEUE_KEY, userId);
    const raw = window.localStorage.getItem(scopedKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Enqueues a sync operation when offline or for asynchronous cloud flush.
 */
export function enqueueSyncItem(
  item: Omit<FocusLockSyncQueueItem, 'id' | 'queuedAt' | 'retryCount'>,
  userId?: string
): FocusLockSyncQueueItem {
  const effectiveUserId = (userId || item.userId || 'guest').trim();
  const queue = loadSyncQueue(effectiveUserId);

  const newItem: FocusLockSyncQueueItem = {
    ...item,
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    userId: effectiveUserId,
    deviceId: item.deviceId || getDeviceId(),
    queuedAt: Date.now(),
    retryCount: 0,
  };

  queue.push(newItem);
  if (queue.length > MAX_SYNC_QUEUE_ITEMS) {
    queue.splice(0, queue.length - MAX_SYNC_QUEUE_ITEMS);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const scopedKey = getUserStorageKey(FOCUS_LOCK_SYNC_QUEUE_KEY, effectiveUserId);
      window.localStorage.setItem(scopedKey, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to persist sync queue item:', e);
    }
  }

  return newItem;
}

/**
 * Removes an acknowledged sync item from the offline queue.
 */
export function removeSyncItem(itemId: string, userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const effectiveUserId = (userId || 'guest').trim();
    const queue = loadSyncQueue(effectiveUserId);
    const updated = queue.filter((i) => i.id !== itemId);
    const scopedKey = getUserStorageKey(FOCUS_LOCK_SYNC_QUEUE_KEY, effectiveUserId);
    window.localStorage.setItem(scopedKey, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to remove sync queue item:', error);
  }
}

/**
 * Clears the offline sync queue.
 */
export function clearSyncQueue(userId?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const scopedKey = getUserStorageKey(FOCUS_LOCK_SYNC_QUEUE_KEY, userId);
    window.localStorage.removeItem(scopedKey);
  } catch (error) {
    console.error('Failed to clear sync queue:', error);
  }
}

/**
 * Migrates settings and history from Guest to an Authenticated User upon login.
 * Preserves user sovereignty and ensures guest progress is not lost.
 */
export function migrateGuestDataToUser(targetUserId: string): {
  migratedSettings: boolean;
  migratedHistoryCount: number;
} {
  if (!targetUserId || targetUserId === 'guest') {
    return { migratedSettings: false, migratedHistoryCount: 0 };
  }

  let migratedSettings = false;
  let migratedHistoryCount = 0;

  try {
    const guestSettings = loadFocusLockSettings('guest');
    const userSettingsRaw = window?.localStorage?.getItem(
      getUserStorageKey(FOCUS_LOCK_STORAGE_KEY, targetUserId)
    );

    // If target user has no saved settings yet, migrate guest settings
    if (!userSettingsRaw) {
      saveFocusLockSettings({ ...guestSettings, userId: targetUserId }, targetUserId);
      migratedSettings = true;
    }

    const guestHistory = loadFocusLockHistory('guest');
    const userHistory = loadFocusLockHistory(targetUserId);

    if (guestHistory.length > 0 && userHistory.length === 0) {
      const migrated = guestHistory.map((rec) => ({
        ...rec,
        userId: targetUserId,
      }));
      saveFocusLockHistory(migrated, targetUserId);
      migratedHistoryCount = migrated.length;
    }
  } catch (error) {
    console.error('Failed to migrate guest data to user:', error);
  }

  return { migratedSettings, migratedHistoryCount };
}

/**
 * Calculates authoritative remaining milliseconds for an active session.
 * Accounts for whether the session is currently paused.
 */
export function calculateAuthoritativeRemainingMs(
  session: ActiveFocusLockSession,
  now: number = Date.now()
): number {
  if (session.pausedAt && session.pausedAt > 0) {
    // Session is paused: remaining time is frozen at the moment of pause
    const remainingAtPause = session.scheduledEndTime - session.pausedAt;
    return Math.max(0, remainingAtPause);
  }

  // Active session: wall-clock countdown
  return Math.max(0, session.scheduledEndTime - now);
}

/**
 * Returns all available apps: presets plus any user-defined custom apps.
 */
export function getAllAvailableApps(customApps: DistractingApp[] = []): DistractingApp[] {
  return [...PRESET_DISTRACTING_APPS, ...customApps];
}
