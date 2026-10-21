import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ThemeMode, UserPreferences } from '../types/settings';
import {
  loadPreferencesFromStorage,
  savePreferencesToStorage,
} from '../utils/settingsStorage';

export interface UsePreferencesReturn {
  preferences: UserPreferences;
  updatePreferences: (newPrefs: UserPreferences) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  durationsMs: {
    focus: number;
    shortBreak: number;
    longBreak: number;
  };
}

export function usePreferences(): UsePreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    loadPreferencesFromStorage()
  );

  // Synchronize document data-theme attribute with current preference
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', preferences.theme);
    }
  }, [preferences.theme]);

  const updatePreferences = useCallback((newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    savePreferencesToStorage(newPrefs);
  }, []);

  const setTheme = useCallback((theme: ThemeMode) => {
    setPreferences((prev) => {
      const updated = { ...prev, theme };
      savePreferencesToStorage(updated);
      return updated;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setPreferences((prev) => {
      const theme: ThemeMode = prev.theme === 'light' ? 'dark' : 'light';
      const updated = { ...prev, theme };
      savePreferencesToStorage(updated);
      return updated;
    });
  }, []);

  // Compute millisecond durations from minutes
  const durationsMs = useMemo(() => {
    return {
      focus: preferences.focusDurationMinutes * 60 * 1000,
      shortBreak: preferences.shortBreakDurationMinutes * 60 * 1000,
      longBreak: preferences.longBreakDurationMinutes * 60 * 1000,
    };
  }, [
    preferences.focusDurationMinutes,
    preferences.shortBreakDurationMinutes,
    preferences.longBreakDurationMinutes,
  ]);

  return {
    preferences,
    updatePreferences,
    setTheme,
    toggleTheme,
    durationsMs,
  };
}
