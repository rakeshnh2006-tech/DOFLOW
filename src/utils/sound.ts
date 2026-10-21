/**
 * Plays a pleasant, harmonic chime when a timer session completes.
 * Uses Web Audio API, requiring no external network requests or audio files.
 * Guarantees that audio playback failures or autoplay blocking NEVER prevent timer completion.
 */
export async function playCompletionSound(): Promise<boolean> {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return false;
    }

    const audioCtx = new AudioContextClass();

    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch {
        // Autoplay may be restricted without user gesture
        return false;
      }
    }

    const now = audioCtx.currentTime;

    // Harmonic two-tone chord: A5 (880 Hz) and E6 (1318.51 Hz)
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now); // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15); // D6

    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now + 0.04);
    osc1.stop(now + 0.7);
    osc2.stop(now + 0.7);

    return new Promise((resolve) => {
      osc1.onended = () => {
        try {
          audioCtx.close();
        } catch {
          // ignore
        }
        resolve(true);
      };

      // Fallback timeout in case onended doesn't trigger
      setTimeout(() => {
        try {
          audioCtx.close();
        } catch {
          // ignore
        }
        resolve(true);
      }, 750);
    });
  } catch {
    // Fail safely without throwing
    return false;
  }
}
