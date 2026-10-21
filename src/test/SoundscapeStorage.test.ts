import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_SOUNDSCAPE_PREFERENCES,
  type SoundscapePreferences,
} from '../types/soundscape';
import {
  loadSoundscapePreferencesFromStorage,
  sanitizeSoundscapePreferences,
  saveSoundscapePreferencesToStorage,
  SOUNDSCAPE_STORAGE_KEY,
} from '../utils/soundscapeStorage';

describe('Feature 8: SoundscapeStorage Unit Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns default soundscape preferences when localStorage is empty', () => {
    const prefs = loadSoundscapePreferencesFromStorage();
    expect(prefs).toEqual(DEFAULT_SOUNDSCAPE_PREFERENCES);
    expect(prefs.enabled).toBe(true);
    expect(prefs.masterVolume).toBe(0.8);
    expect(prefs.isMuted).toBe(false);
    expect(prefs.volumes.rain).toBe(0.7);
    expect(prefs.volumes.forest).toBe(0.7);
    expect(prefs.volumes.cafe).toBe(0.7);
    expect(prefs.volumes.whiteNoise).toBe(0.6);
  });

  it('saves and restores soundscape preferences correctly', () => {
    const customPrefs: SoundscapePreferences = {
      enabled: true,
      masterVolume: 0.5,
      isMuted: true,
      lastSelectedId: 'forest',
      volumes: {
        rain: 0.9,
        forest: 0.4,
        cafe: 0.2,
        whiteNoise: 0.8,
      },
    };

    saveSoundscapePreferencesToStorage(customPrefs);
    const loaded = loadSoundscapePreferencesFromStorage();

    expect(loaded.masterVolume).toBe(0.5);
    expect(loaded.isMuted).toBe(true);
    expect(loaded.lastSelectedId).toBe('forest');
    expect(loaded.volumes.rain).toBe(0.9);
    expect(loaded.volumes.forest).toBe(0.4);
    expect(loaded.volumes.cafe).toBe(0.2);
    expect(loaded.volumes.whiteNoise).toBe(0.8);
  });

  it('clamps invalid or out-of-range volume values between 0.0 and 1.0', () => {
    const malformed = {
      enabled: 'not-a-bool',
      masterVolume: 1.5, // > 1.0
      isMuted: 'no',
      lastSelectedId: 'non-existent-track',
      volumes: {
        rain: -0.5, // < 0.0
        forest: 'loud',
        cafe: 2.0,
      },
    };

    const sanitized = sanitizeSoundscapePreferences(malformed);
    expect(sanitized.masterVolume).toBe(1.0);
    expect(sanitized.volumes.rain).toBe(0.0);
    expect(sanitized.volumes.forest).toBe(DEFAULT_SOUNDSCAPE_PREFERENCES.volumes.forest);
    expect(sanitized.volumes.cafe).toBe(1.0);
    expect(sanitized.lastSelectedId).toBe(DEFAULT_SOUNDSCAPE_PREFERENCES.lastSelectedId);
  });

  it('recovers gracefully from corrupted JSON in localStorage', () => {
    window.localStorage.setItem(SOUNDSCAPE_STORAGE_KEY, '{invalid-json:::');
    const loaded = loadSoundscapePreferencesFromStorage();
    expect(loaded).toEqual(DEFAULT_SOUNDSCAPE_PREFERENCES);
  });

  it('does NOT store runtime playback state (isPlaying is never persisted)', () => {
    const prefs: SoundscapePreferences = {
      ...DEFAULT_SOUNDSCAPE_PREFERENCES,
      lastSelectedId: 'cafe',
    };

    saveSoundscapePreferencesToStorage(prefs);
    const raw = window.localStorage.getItem(SOUNDSCAPE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.isPlaying).toBeUndefined();
  });
});
