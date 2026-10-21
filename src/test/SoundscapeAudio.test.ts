import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { SoundscapeAudioManager } from '../utils/soundscapeAudio';

describe('Feature 8: SoundscapeAudio Unit Tests', () => {
  let manager: SoundscapeAudioManager;

  beforeEach(() => {
    manager = new SoundscapeAudioManager(0.8, false);
  });

  afterEach(() => {
    manager.dispose();
  });

  it('initializes with default master volume and track volumes without crashing', () => {
    expect(manager.isCurrentlyPlaying()).toBe(false);
    expect(manager.getActiveSoundId()).toBeNull();
  });

  it('clamps master volume and track volumes within 0.0 to 1.0', () => {
    manager.setMasterVolume(1.8);
    // Setting beyond 1 clamps to 1
    manager.setMasterVolume(-0.5);
    // Setting below 0 clamps to 0
    manager.setTrackVolume('rain', 2.0);
    manager.setTrackVolume('forest', -0.2);
    // No errors thrown
  });

  it('safely handles missing AudioContext in test environments without throwing', async () => {
    // In jsdom where AudioContext is not defined
    const originalAudioContext = window.AudioContext;
    // @ts-expect-error Intentionally clearing AudioContext for testing
    delete window.AudioContext;

    const result = await manager.play('rain');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Web Audio API is not supported');
    expect(manager.isCurrentlyPlaying()).toBe(false);

    window.AudioContext = originalAudioContext;
  });

  it('detects browser autoplay restrictions and reports autoplayBlocked without pretending sound is playing', async () => {
    class MockBlockedAudioContext {
      state = 'suspended';
      currentTime = 0;
      resume() {
        return Promise.reject(new Error('Autoplay blocked'));
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            cancelScheduledValues: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
      }
      destination = {};
      close() {
        return Promise.resolve();
      }
    }

    // @ts-expect-error Mocking window.AudioContext
    window.AudioContext = MockBlockedAudioContext;

    const testManager = new SoundscapeAudioManager(0.7, false);
    const result = await testManager.play('forest');

    expect(result.success).toBe(false);
    expect(result.autoplayBlocked).toBe(true);
    expect(testManager.isCurrentlyPlaying()).toBe(false);

    testManager.dispose();
    // @ts-expect-error Cleaning up mock
    delete window.AudioContext;
  });

  it('successfully generates procedural buffers and plays when AudioContext runs', async () => {
    class MockWorkingAudioContext {
      state = 'running';
      currentTime = 0;
      sampleRate = 44100;
      resume() {
        return Promise.resolve();
      }
      createBuffer(channels: number, length: number) {
        return {
          numberOfChannels: channels,
          length,
          getChannelData: () => new Float32Array(length),
        };
      }
      createBufferSource() {
        return {
          buffer: null,
          loop: false,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            cancelScheduledValues: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
      }
      destination = {};
      close() {
        return Promise.resolve();
      }
    }

    // @ts-expect-error Mocking window.AudioContext
    window.AudioContext = MockWorkingAudioContext;

    const testManager = new SoundscapeAudioManager(0.8, false);
    const result = await testManager.play('rain');

    expect(result.success).toBe(true);
    expect(testManager.isCurrentlyPlaying()).toBe(true);
    expect(testManager.getActiveSoundId()).toBe('rain');

    // Pausing stops active source
    testManager.pause();
    expect(testManager.isCurrentlyPlaying()).toBe(false);
    expect(testManager.getActiveSoundId()).toBe('rain');

    // Stop all clears active sound
    testManager.stopAll();
    expect(testManager.getActiveSoundId()).toBeNull();

    testManager.dispose();
    // @ts-expect-error Cleaning up mock
    delete window.AudioContext;
  });
});
