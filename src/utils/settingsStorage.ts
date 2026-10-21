import type { UserPreferences } from '../types/settings';
import { DEFAULT_PREFERENCES } from '../types/settings';

export const PREFERENCES_STORAGE_KEY = 'doflow_user_preferences_v1';

/**
 * Validates a single duration integer within 1-120 range.
 */
function isValidDuration(val: unknown): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val >= 1 && val <= 120;
}

/**
 * Safely loads user preferences from localStorage, falling back to defaults on any missing or invalid field.
 */
export function loadPreferencesFromStorage(): UserPreferences {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_PREFERENCES };
    }

    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_PREFERENCES };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_PREFERENCES };
    }

    const focusDurationMinutes = isValidDuration(parsed.focusDurationMinutes)
      ? parsed.focusDurationMinutes
      : DEFAULT_PREFERENCES.focusDurationMinutes;

    const shortBreakDurationMinutes = isValidDuration(parsed.shortBreakDurationMinutes)
      ? parsed.shortBreakDurationMinutes
      : DEFAULT_PREFERENCES.shortBreakDurationMinutes;

    const longBreakDurationMinutes = isValidDuration(parsed.longBreakDurationMinutes)
      ? parsed.longBreakDurationMinutes
      : DEFAULT_PREFERENCES.longBreakDurationMinutes;

    const theme = parsed.theme === 'dark' || parsed.theme === 'light'
      ? parsed.theme
      : DEFAULT_PREFERENCES.theme;

    const soundEnabled = typeof parsed.soundEnabled === 'boolean'
      ? parsed.soundEnabled
      : DEFAULT_PREFERENCES.soundEnabled;

    return {
      focusDurationMinutes,
      shortBreakDurationMinutes,
      longBreakDurationMinutes,
      theme,
      soundEnabled,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Safely saves user preferences to localStorage.
 */
export function savePreferencesToStorage(prefs: UserPreferences): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Fail safely if quota is exceeded or storage is restricted
  }
}
