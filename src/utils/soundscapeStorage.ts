import {
  DEFAULT_SOUNDSCAPE_PREFERENCES,
  type SoundscapeId,
  type SoundscapePreferences,
} from '../types/soundscape';

export const SOUNDSCAPE_STORAGE_KEY = 'doflow_soundscape_preferences_v1';

const VALID_SOUNDSCAPE_IDS: Set<string> = new Set<SoundscapeId>([
  'rain',
  'forest',
  'cafe',
  'whiteNoise',
]);

function clampVolume(val: unknown, fallback: number): number {
  if (typeof val !== 'number' || isNaN(val)) return fallback;
  return Math.max(0, Math.min(1, val));
}

/**
 * Validates and sanitizes unknown storage data into a valid SoundscapePreferences object.
 */
export function sanitizeSoundscapePreferences(data: unknown): SoundscapePreferences {
  if (!data || typeof data !== 'object') {
    return { ...DEFAULT_SOUNDSCAPE_PREFERENCES };
  }

  const candidate = data as Record<string, unknown>;

  const enabled =
    typeof candidate.enabled === 'boolean'
      ? candidate.enabled
      : DEFAULT_SOUNDSCAPE_PREFERENCES.enabled;

  const masterVolume = clampVolume(
    candidate.masterVolume,
    DEFAULT_SOUNDSCAPE_PREFERENCES.masterVolume
  );

  const isMuted =
    typeof candidate.isMuted === 'boolean'
      ? candidate.isMuted
      : DEFAULT_SOUNDSCAPE_PREFERENCES.isMuted;

  let lastSelectedId: SoundscapeId | null = DEFAULT_SOUNDSCAPE_PREFERENCES.lastSelectedId;
  if (candidate.lastSelectedId === null) {
    lastSelectedId = null;
  } else if (
    typeof candidate.lastSelectedId === 'string' &&
    VALID_SOUNDSCAPE_IDS.has(candidate.lastSelectedId)
  ) {
    lastSelectedId = candidate.lastSelectedId as SoundscapeId;
  }

  const rawVolumes =
    candidate.volumes && typeof candidate.volumes === 'object'
      ? (candidate.volumes as Record<string, unknown>)
      : {};

  const volumes: Record<SoundscapeId, number> = {
    rain: clampVolume(rawVolumes.rain, DEFAULT_SOUNDSCAPE_PREFERENCES.volumes.rain),
    forest: clampVolume(rawVolumes.forest, DEFAULT_SOUNDSCAPE_PREFERENCES.volumes.forest),
    cafe: clampVolume(rawVolumes.cafe, DEFAULT_SOUNDSCAPE_PREFERENCES.volumes.cafe),
    whiteNoise: clampVolume(rawVolumes.whiteNoise, DEFAULT_SOUNDSCAPE_PREFERENCES.volumes.whiteNoise),
  };

  return {
    enabled,
    masterVolume,
    volumes,
    isMuted,
    lastSelectedId,
  };
}

/**
 * Safely loads soundscape preferences from localStorage, returning defaults on any error.
 */
export function loadSoundscapePreferencesFromStorage(): SoundscapePreferences {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_SOUNDSCAPE_PREFERENCES };
    }

    const raw = window.localStorage.getItem(SOUNDSCAPE_STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SOUNDSCAPE_PREFERENCES };
    }

    const parsed = JSON.parse(raw);
    return sanitizeSoundscapePreferences(parsed);
  } catch {
    return { ...DEFAULT_SOUNDSCAPE_PREFERENCES };
  }
}

/**
 * Safely saves soundscape preferences to localStorage.
 */
export function saveSoundscapePreferencesToStorage(prefs: SoundscapePreferences): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    // Only persist necessary preferences (never runtime playing state)
    const sanitized = sanitizeSoundscapePreferences(prefs);
    window.localStorage.setItem(SOUNDSCAPE_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Fail safely if quota exceeded or storage disabled
  }
}
