import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadPreferencesFromStorage,
  savePreferencesToStorage,
  PREFERENCES_STORAGE_KEY,
} from '../utils/settingsStorage';
import {
  DEFAULT_PREFERENCES,
  validateDurationMinutes,
  type UserPreferences,
} from '../types/settings';

describe('Settings Storage & Validation Utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('validateDurationMinutes', () => {
    it('accepts valid whole numbers between 1 and 120', () => {
      expect(validateDurationMinutes(1, 'Focus')).toBeNull();
      expect(validateDurationMinutes(25, 'Focus')).toBeNull();
      expect(validateDurationMinutes(60, 'Short break')).toBeNull();
      expect(validateDurationMinutes(120, 'Long break')).toBeNull();
      expect(validateDurationMinutes('25', 'Focus')).toBeNull();
    });

    it('rejects empty or nullish values', () => {
      expect(validateDurationMinutes('', 'Focus')).toBe('Focus duration cannot be empty.');
      expect(validateDurationMinutes(null, 'Focus')).toBe('Focus duration cannot be empty.');
      expect(validateDurationMinutes(undefined, 'Focus')).toBe('Focus duration cannot be empty.');
    });

    it('rejects non-numeric inputs', () => {
      expect(validateDurationMinutes('abc', 'Focus')).toBe('Focus duration must be a valid number.');
      expect(validateDurationMinutes(NaN, 'Focus')).toBe('Focus duration must be a valid number.');
    });

    it('rejects decimal numbers', () => {
      expect(validateDurationMinutes(25.5, 'Focus')).toBe('Focus duration must be a whole number.');
      expect(validateDurationMinutes('5.2', 'Short break')).toBe('Short break duration must be a whole number.');
    });

    it('rejects values below 1 minute', () => {
      expect(validateDurationMinutes(0, 'Focus')).toBe('Focus duration must be between 1 and 120 minutes.');
      expect(validateDurationMinutes(-10, 'Focus')).toBe('Focus duration must be between 1 and 120 minutes.');
    });

    it('rejects values above 120 minutes', () => {
      expect(validateDurationMinutes(121, 'Focus')).toBe('Focus duration must be between 1 and 120 minutes.');
      expect(validateDurationMinutes(999, 'Long break')).toBe('Long break duration must be between 1 and 120 minutes.');
    });
  });

  describe('loadPreferencesFromStorage', () => {
    it('returns default preferences when storage is empty', () => {
      const prefs = loadPreferencesFromStorage();
      expect(prefs).toEqual(DEFAULT_PREFERENCES);
    });

    it('loads previously saved preferences accurately', () => {
      const customPrefs: UserPreferences = {
        focusDurationMinutes: 50,
        shortBreakDurationMinutes: 10,
        longBreakDurationMinutes: 20,
        theme: 'dark',
        soundEnabled: false,
      };

      savePreferencesToStorage(customPrefs);
      const loaded = loadPreferencesFromStorage();
      expect(loaded).toEqual(customPrefs);
    });

    it('recovers safely from invalid JSON in localStorage', () => {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, '{invalidJson: true,,,');
      const loaded = loadPreferencesFromStorage();
      expect(loaded).toEqual(DEFAULT_PREFERENCES);
    });

    it('recovers safely from non-object JSON values', () => {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify('string-value'));
      expect(loadPreferencesFromStorage()).toEqual(DEFAULT_PREFERENCES);

      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(12345));
      expect(loadPreferencesFromStorage()).toEqual(DEFAULT_PREFERENCES);
    });

    it('falls back to defaults for invalid or out-of-range duration values while preserving valid fields', () => {
      const corruptedFields = {
        focusDurationMinutes: 500, // out of range -> default 25
        shortBreakDurationMinutes: -5, // negative -> default 5
        longBreakDurationMinutes: 30, // valid -> 30
        theme: 'dark', // valid -> dark
        soundEnabled: false, // valid -> false
      };

      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(corruptedFields));
      const loaded = loadPreferencesFromStorage();

      expect(loaded.focusDurationMinutes).toBe(DEFAULT_PREFERENCES.focusDurationMinutes);
      expect(loaded.shortBreakDurationMinutes).toBe(DEFAULT_PREFERENCES.shortBreakDurationMinutes);
      expect(loaded.longBreakDurationMinutes).toBe(30);
      expect(loaded.theme).toBe('dark');
      expect(loaded.soundEnabled).toBe(false);
    });

    it('falls back to defaults when theme or soundEnabled are invalid', () => {
      const invalidThemeAndSound = {
        focusDurationMinutes: 25,
        shortBreakDurationMinutes: 5,
        longBreakDurationMinutes: 15,
        theme: 'neon-cyberpunk', // invalid theme -> default 'light'
        soundEnabled: 'maybe', // invalid boolean -> default true
      };

      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(invalidThemeAndSound));
      const loaded = loadPreferencesFromStorage();

      expect(loaded.theme).toBe('light');
      expect(loaded.soundEnabled).toBe(true);
    });
  });

  describe('savePreferencesToStorage', () => {
    it('handles localStorage quota exceeded errors without throwing', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        savePreferencesToStorage({
          focusDurationMinutes: 30,
          shortBreakDurationMinutes: 5,
          longBreakDurationMinutes: 15,
          theme: 'light',
          soundEnabled: true,
        });
      }).not.toThrow();
    });
  });
});
