import { useCallback, useEffect, useRef, useState } from 'react';
import type { SoundscapeId, SoundscapePreferences } from '../types/soundscape';
import {
  loadSoundscapePreferencesFromStorage,
  saveSoundscapePreferencesToStorage,
} from '../utils/soundscapeStorage';
import { SoundscapeAudioManager } from '../utils/soundscapeAudio';

export interface UseSoundscapeReturn {
  activeSoundId: SoundscapeId | null;
  isPlaying: boolean;
  isMuted: boolean;
  masterVolume: number;
  volumes: Record<SoundscapeId, number>;
  enabled: boolean;
  error: string | null;
  isAutoplayBlocked: boolean;
  lastSelectedId: SoundscapeId | null;
  playSound: (id: SoundscapeId) => Promise<boolean>;
  pauseSound: () => void;
  resumeSound: () => Promise<boolean>;
  stopAll: () => void;
  setMasterVolume: (vol: number) => void;
  setTrackVolume: (id: SoundscapeId, vol: number) => void;
  toggleMute: () => void;
  setEnabled: (enabled: boolean) => void;
  clearError: () => void;
}

export function useSoundscape(): UseSoundscapeReturn {
  // Load persisted preferences (or sensible defaults)
  const [preferences, setPreferences] = useState<SoundscapePreferences>(() =>
    loadSoundscapePreferencesFromStorage()
  );

  // Runtime playback state (NEVER auto-starts on page load)
  const [activeSoundId, setActiveSoundId] = useState<SoundscapeId | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);

  // Audio manager instance ref
  const audioManagerRef = useRef<SoundscapeAudioManager | null>(null);
  const initialPrefsRef = useRef(preferences);

  // Initialize audio manager on first client render
  useEffect(() => {
    const manager = new SoundscapeAudioManager(
      initialPrefsRef.current.masterVolume,
      initialPrefsRef.current.isMuted,
      initialPrefsRef.current.volumes
    );
    audioManagerRef.current = manager;

    return () => {
      // Release audio resources when unmounting
      manager.dispose();
      audioManagerRef.current = null;
    };
  }, []); // Run once on mount

  // Sync preferences to localStorage whenever changed
  const updatePreferences = useCallback((updater: (prev: SoundscapePreferences) => SoundscapePreferences) => {
    setPreferences((prev) => {
      const next = updater(prev);
      saveSoundscapePreferencesToStorage(next);
      return next;
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setIsAutoplayBlocked(false);
  }, []);

  // 1. Play soundscape
  const playSound = useCallback(
    async (id: SoundscapeId): Promise<boolean> => {
      if (!audioManagerRef.current) return false;

      clearError();
      const result = await audioManagerRef.current.play(id);

      if (result.success) {
        setActiveSoundId(id);
        setIsPlaying(true);
        setIsAutoplayBlocked(false);
        setError(null);
        updatePreferences((prev) => ({ ...prev, lastSelectedId: id }));
        return true;
      } else {
        setIsPlaying(false);
        if (result.autoplayBlocked) {
          setIsAutoplayBlocked(true);
          setError('Browser audio playback was blocked. Please click play to enable sound.');
        } else {
          setError(result.error || 'Playback failed.');
        }
        return false;
      }
    },
    [clearError, updatePreferences]
  );

  // 2. Pause active soundscape
  const pauseSound = useCallback(() => {
    if (!audioManagerRef.current) return;
    audioManagerRef.current.pause();
    setIsPlaying(false);
  }, []);

  // 3. Resume soundscape
  const resumeSound = useCallback(async (): Promise<boolean> => {
    const target = activeSoundId || preferences.lastSelectedId || 'rain';
    return playSound(target);
  }, [activeSoundId, preferences.lastSelectedId, playSound]);

  // 4. Stop all sounds
  const stopAll = useCallback(() => {
    if (!audioManagerRef.current) return;
    audioManagerRef.current.stopAll();
    setIsPlaying(false);
    setActiveSoundId(null);
  }, []);

  // 5. Set master volume
  const setMasterVolume = useCallback(
    (vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      audioManagerRef.current?.setMasterVolume(clamped);
      updatePreferences((prev) => ({ ...prev, masterVolume: clamped }));
    },
    [updatePreferences]
  );

  // 6. Set track volume
  const setTrackVolume = useCallback(
    (id: SoundscapeId, vol: number) => {
      const clamped = Math.max(0, Math.min(1, vol));
      audioManagerRef.current?.setTrackVolume(id, clamped);
      updatePreferences((prev) => ({
        ...prev,
        volumes: { ...prev.volumes, [id]: clamped },
      }));
    },
    [updatePreferences]
  );

  // 7. Toggle mute
  const toggleMute = useCallback(() => {
    updatePreferences((prev) => {
      const nextMuted = !prev.isMuted;
      audioManagerRef.current?.setMuted(nextMuted);
      return { ...prev, isMuted: nextMuted };
    });
  }, [updatePreferences]);

  // 8. Toggle soundscape availability
  const setEnabled = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        stopAll();
      }
      updatePreferences((prev) => ({ ...prev, enabled }));
    },
    [stopAll, updatePreferences]
  );

  return {
    activeSoundId,
    isPlaying,
    isMuted: preferences.isMuted,
    masterVolume: preferences.masterVolume,
    volumes: preferences.volumes,
    enabled: preferences.enabled,
    error,
    isAutoplayBlocked,
    lastSelectedId: preferences.lastSelectedId,
    playSound,
    pauseSound,
    resumeSound,
    stopAll,
    setMasterVolume,
    setTrackVolume,
    toggleMute,
    setEnabled,
    clearError,
  };
}
