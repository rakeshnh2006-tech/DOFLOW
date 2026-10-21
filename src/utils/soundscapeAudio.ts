import type { SoundscapeId } from '../types/soundscape';

interface PlayResult {
  success: boolean;
  autoplayBlocked?: boolean;
  error?: string;
}

/**
 * Procedural Web Audio Soundscape Manager.
 * Synthesizes natural ambient focus soundscapes browser-natively without external files or streaming.
 */
export class SoundscapeAudioManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private trackGains: Map<SoundscapeId, GainNode> = new Map();
  private activeSource: AudioBufferSourceNode | null = null;
  private activeSoundId: SoundscapeId | null = null;
  private bufferCache: Map<SoundscapeId, AudioBuffer> = new Map();
  private masterVolume: number = 0.8;
  private isMuted: boolean = false;
  private trackVolumes: Record<SoundscapeId, number> = {
    rain: 0.7,
    forest: 0.7,
    cafe: 0.7,
    whiteNoise: 0.6,
  };

  constructor(initialMasterVolume = 0.8, initialMuted = false, initialVolumes?: Record<SoundscapeId, number>) {
    this.masterVolume = initialMasterVolume;
    this.isMuted = initialMuted;
    if (initialVolumes) {
      this.trackVolumes = { ...initialVolumes };
    }
  }

  /**
   * Initializes or returns the existing AudioContext.
   */
  private getAudioContext(): AudioContext | null {
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      return this.audioCtx;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    try {
      this.audioCtx = new AudioContextClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.isMuted ? 0 : this.masterVolume,
        this.audioCtx.currentTime
      );
      this.masterGain.connect(this.audioCtx.destination);
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Generates seamless loop buffers for procedural soundscapes.
   */
  private getOrCreateBuffer(id: SoundscapeId, ctx: AudioContext): AudioBuffer {
    const cached = this.bufferCache.get(id);
    if (cached) return cached;

    const sampleRate = ctx.sampleRate || 44100;
    const duration = 6; // 6 seconds seamless loop
    const frameCount = sampleRate * duration;
    const buffer = ctx.createBuffer(2, frameCount, sampleRate);

    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    if (id === 'whiteNoise') {
      // Clean, low-fatigue white/pink static
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        // Soft volume to prevent ear fatigue
        left[i] = white * 0.18;
        right[i] = (Math.random() * 2 - 1) * 0.18;
      }
    } else if (id === 'rain') {
      // Filtered pink noise with droplet patter
      let b0L = 0, b1L = 0, b2L = 0, b3L = 0, b4L = 0, b5L = 0, b6L = 0;
      let b0R = 0, b1R = 0, b2R = 0, b3R = 0, b4R = 0, b5R = 0, b6R = 0;

      for (let i = 0; i < frameCount; i++) {
        const whiteL = Math.random() * 2 - 1;
        b0L = 0.99886 * b0L + whiteL * 0.0555179;
        b1L = 0.99332 * b1L + whiteL * 0.0750759;
        b2L = 0.96900 * b2L + whiteL * 0.1538520;
        b3L = 0.86650 * b3L + whiteL * 0.3104856;
        b4L = 0.55000 * b4L + whiteL * 0.5329522;
        b5L = -0.7616 * b5L - whiteL * 0.0168980;
        const pinkL = b0L + b1L + b2L + b3L + b4L + b5L + b6L + whiteL * 0.5362;
        b6L = whiteL * 0.115926;

        const whiteR = Math.random() * 2 - 1;
        b0R = 0.99886 * b0R + whiteR * 0.0555179;
        b1R = 0.99332 * b1R + whiteR * 0.0750759;
        b2R = 0.96900 * b2R + whiteR * 0.1538520;
        b3R = 0.86650 * b3R + whiteR * 0.3104856;
        b4R = 0.55000 * b4R + whiteR * 0.5329522;
        b5R = -0.7616 * b5R - whiteR * 0.0168980;
        const pinkR = b0R + b1R + b2R + b3R + b4R + b5R + b6R + whiteR * 0.5362;
        b6R = whiteR * 0.115926;

        // Occasional randomized raindrop patter click
        const droplet = Math.random() > 0.994 ? (Math.random() * 0.25 - 0.125) : 0;

        left[i] = pinkL * 0.06 + droplet;
        right[i] = pinkR * 0.06 + droplet;
      }
    } else if (id === 'forest') {
      // Woodland breeze + subtle rustling leaves & chirps
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.05;
        b1 = 0.985 * b1 + white * 0.11;
        b2 = 0.950 * b2 + white * 0.22;
        const wind = (b0 + b1 + b2) * 0.08;

        // Gentle sinusoidal breeze swell
        const swell = Math.sin((i / sampleRate) * 0.4) * 0.3 + 0.7;

        // Subtle chirp burst at 1.8s and 4.2s
        const tSec = i / sampleRate;
        let chirp = 0;
        if ((tSec > 1.8 && tSec < 1.95) || (tSec > 4.2 && tSec < 4.35)) {
          chirp = Math.sin(tSec * 3200 * 2 * Math.PI) * 0.04;
        }

        left[i] = wind * swell + chirp;
        right[i] = wind * swell + chirp * 0.8;
      }
    } else if (id === 'cafe') {
      // Warm room tone / ambient conversational hum + occasional ceramic clink
      let lowPass = 0;
      for (let i = 0; i < frameCount; i++) {
        const white = Math.random() * 2 - 1;
        // Lowpass filtered noise for warm ambient chatter murmur
        lowPass = lowPass + 0.04 * (white - lowPass);

        // Slow modulation of chatter envelope
        const roomSwell = Math.sin((i / sampleRate) * 0.8) * 0.2 + 0.8;

        // Gentle cup / saucer harmonic clink at 2.4s
        const tSec = i / sampleRate;
        let clink = 0;
        if (tSec > 2.4 && tSec < 2.48) {
          const decay = Math.exp(-(tSec - 2.4) * 45);
          clink = Math.sin((tSec - 2.4) * 2600 * 2 * Math.PI) * decay * 0.05;
        }

        left[i] = lowPass * 0.35 * roomSwell + clink;
        right[i] = lowPass * 0.35 * roomSwell + clink * 0.7;
      }
    }

    // Apply seamless loop crossfade on edges (first & last 1200 samples)
    const fadeLen = 1200;
    for (let i = 0; i < fadeLen; i++) {
      const alpha = i / fadeLen;
      left[i] = left[i] * alpha + left[frameCount - fadeLen + i] * (1 - alpha);
      right[i] = right[i] * alpha + right[frameCount - fadeLen + i] * (1 - alpha);
    }

    this.bufferCache.set(id, buffer);
    return buffer;
  }

  /**
   * Plays the specified soundscape track.
   * If another track was playing, stops it first to avoid overlapping playback.
   */
  public async play(id: SoundscapeId): Promise<PlayResult> {
    const ctx = this.getAudioContext();
    if (!ctx) {
      return { success: false, error: 'Web Audio API is not supported in this browser.' };
    }

    // Handle suspended AudioContext (browser autoplay policy)
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return { success: false, autoplayBlocked: true, error: 'Audio autoplay blocked by browser policy.' };
      }
    }

    if (ctx.state !== 'running') {
      return { success: false, autoplayBlocked: true, error: 'AudioContext is not active.' };
    }

    // If already playing this track, keep going
    if (this.activeSoundId === id && this.activeSource) {
      return { success: true };
    }

    // Stop current source if different
    this.stopActiveSource();

    try {
      const buffer = this.getOrCreateBuffer(id, ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Track-specific gain node
      let trackGain = this.trackGains.get(id);
      if (!trackGain) {
        trackGain = ctx.createGain();
        this.trackGains.set(id, trackGain);
      }

      const targetVol = this.trackVolumes[id] ?? 0.7;
      // Gentle fade in (50ms) to prevent popping
      const now = ctx.currentTime;
      trackGain.gain.cancelScheduledValues(now);
      trackGain.gain.setValueAtTime(0.001, now);
      trackGain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVol), now + 0.05);

      source.connect(trackGain);
      if (this.masterGain) {
        trackGain.connect(this.masterGain);
      }

      source.start(now);
      this.activeSource = source;
      this.activeSoundId = id;

      return { success: true };
    } catch (err) {
      this.activeSource = null;
      this.activeSoundId = null;
      return { success: false, error: (err as Error).message };
    }
  }

  /**
   * Pauses the currently playing soundscape.
   */
  public pause(): void {
    this.stopActiveSource();
  }

  /**
   * Resumes the active soundscape if one was selected.
   */
  public async resume(id?: SoundscapeId): Promise<PlayResult> {
    const targetId = id || this.activeSoundId;
    if (!targetId) {
      return { success: false, error: 'No active soundscape to resume.' };
    }
    return this.play(targetId);
  }

  /**
   * Stops all soundscape playback and clears active track.
   */
  public stopAll(): void {
    this.stopActiveSource();
    this.activeSoundId = null;
  }

  private stopActiveSource(): void {
    if (this.activeSource) {
      try {
        const now = this.audioCtx?.currentTime || 0;
        this.activeSource.stop(now);
        this.activeSource.disconnect();
      } catch {
        // Ignore if already stopped
      }
      this.activeSource = null;
    }
  }

  /**
   * Sets master volume (0.0 to 1.0).
   */
  public setMasterVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.masterVolume = clamped;
    if (this.masterGain && this.audioCtx) {
      const target = this.isMuted ? 0 : clamped;
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(target, now);
    }
  }

  /**
   * Sets the volume for an individual soundscape track (0.0 to 1.0).
   */
  public setTrackVolume(id: SoundscapeId, vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.trackVolumes[id] = clamped;
    const trackGain = this.trackGains.get(id);
    if (trackGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      trackGain.gain.cancelScheduledValues(now);
      trackGain.gain.setValueAtTime(clamped, now);
    }
  }

  /**
   * Toggles master mute.
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      const target = muted ? 0 : this.masterVolume;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(target, now);
    }
  }

  public getActiveSoundId(): SoundscapeId | null {
    return this.activeSoundId;
  }

  public isCurrentlyPlaying(): boolean {
    return this.activeSource !== null && this.activeSoundId !== null;
  }

  /**
   * Releases all audio resources and closes the AudioContext.
   */
  public dispose(): void {
    this.stopAll();
    this.trackGains.forEach((gain) => {
      try {
        gain.disconnect();
      } catch {
        // Safe disconnect
      }
    });
    this.trackGains.clear();

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Safe disconnect
      }
      this.masterGain = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // Safe close
      }
      this.audioCtx = null;
    }

    this.bufferCache.clear();
  }
}
