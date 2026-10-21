import type { SessionReflection } from '../types/intelligence';

export const SESSION_REFLECTIONS_STORAGE_KEY = 'doflow_session_reflections_v1';

/**
 * Validates whether an unknown value conforms to SessionReflection.
 */
function isValidReflection(item: unknown): item is SessionReflection {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const candidate = item as Record<string, unknown>;
  const validQualities = ['productive', 'distracted', 'interrupted'];
  return (
    typeof candidate.sessionId === 'string' &&
    candidate.sessionId.length > 0 &&
    typeof candidate.completedAt === 'number' &&
    typeof candidate.localDate === 'string' &&
    candidate.localDate.length === 10 &&
    typeof candidate.quality === 'string' &&
    validQualities.includes(candidate.quality) &&
    (candidate.note === undefined || typeof candidate.note === 'string')
  );
}

/**
 * Safely loads reflections from localStorage, returning an empty array on failure or malformed data.
 */
export function loadReflectionsFromStorage(): SessionReflection[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    const raw = window.localStorage.getItem(SESSION_REFLECTIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isValidReflection);
  } catch {
    return [];
  }
}

/**
 * Safely saves reflections array to localStorage.
 */
export function saveReflectionsToStorage(reflections: SessionReflection[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(
      SESSION_REFLECTIONS_STORAGE_KEY,
      JSON.stringify(reflections)
    );
  } catch {
    // Fail safely if quota is exceeded or storage unavailable
  }
}

/**
 * Adds or updates a reflection for a session, preventing duplicates.
 */
export function saveSessionReflection(reflection: SessionReflection): SessionReflection[] {
  const existing = loadReflectionsFromStorage();
  const existingIndex = existing.findIndex((r) => r.sessionId === reflection.sessionId);

  let updated: SessionReflection[];
  if (existingIndex >= 0) {
    updated = [...existing];
    updated[existingIndex] = reflection;
  } else {
    updated = [reflection, ...existing];
  }

  saveReflectionsToStorage(updated);
  return updated;
}

/**
 * Retrieves reflection for a given session ID, or null if none exists.
 */
export function getReflectionForSession(sessionId: string): SessionReflection | null {
  const all = loadReflectionsFromStorage();
  return all.find((r) => r.sessionId === sessionId) || null;
}
