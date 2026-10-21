import type { CompletedSessionRecord } from '../types/stats';

export const SESSION_HISTORY_STORAGE_KEY = 'doflow_session_history_v1';

/**
 * Returns the calendar date formatted as YYYY-MM-DD in the user's LOCAL timezone.
 */
export function getLocalDateString(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validates whether an unknown value conforms to CompletedSessionRecord.
 */
function isValidSessionRecord(item: unknown): item is CompletedSessionRecord {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    (candidate.mode === 'focus' ||
      candidate.mode === 'shortBreak' ||
      candidate.mode === 'longBreak') &&
    typeof candidate.durationMs === 'number' &&
    candidate.durationMs > 0 &&
    typeof candidate.completedAt === 'number' &&
    typeof candidate.localDate === 'string' &&
    candidate.localDate.length === 10
  );
}

/**
 * Safely loads session history from localStorage, returning an empty array on any failure or malformed data.
 */
export function loadSessionHistoryFromStorage(): CompletedSessionRecord[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    const raw = window.localStorage.getItem(SESSION_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidSessionRecord);
  } catch {
    // Gracefully recover from syntax errors, storage restrictions, etc.
    return [];
  }
}

/**
 * Safely saves session history to localStorage.
 */
export function saveSessionHistoryToStorage(records: CompletedSessionRecord[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Fail safely if quota is exceeded or storage is unavailable
  }
}
