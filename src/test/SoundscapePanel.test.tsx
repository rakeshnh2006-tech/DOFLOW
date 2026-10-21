import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from '../App';
import { SoundscapePanel } from '../components/SoundscapePanel';
import type { UseSoundscapeReturn } from '../hooks/useSoundscape';

class MockAudioContextForUI {
  state = 'running';
  currentTime = 0;
  sampleRate = 44100;
  resume = vi.fn().mockResolvedValue(undefined);
  createBuffer = vi.fn().mockImplementation((channels: number, length: number) => ({
    numberOfChannels: channels,
    length,
    getChannelData: () => new Float32Array(length),
  }));
  createBufferSource = vi.fn().mockImplementation(() => ({
    buffer: null,
    loop: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }));
  createGain = vi.fn().mockImplementation(() => ({
    gain: {
      setValueAtTime: vi.fn(),
      cancelScheduledValues: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  destination = {};
  close = vi.fn().mockResolvedValue(undefined);
}

describe('Feature 8: SoundscapePanel Integration Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // @ts-expect-error Mocking window.AudioContext for tests
    window.AudioContext = MockAudioContextForUI;
  });

  afterEach(() => {
    // @ts-expect-error Cleaning up mock
    delete window.AudioContext;
  });

  it('navigates to the Soundscape view using the header navigation tab and keeps timer mounted', () => {
    render(<App />);

    // Initially on Timer view
    expect(screen.getByTestId('timer-card')).toBeInTheDocument();

    // Click Soundscape nav tab
    const soundscapeNavBtn = screen.getByTestId('nav-soundscape');
    fireEvent.click(soundscapeNavBtn);

    // Soundscape panel is visible
    expect(screen.getByTestId('soundscape-panel')).toBeInTheDocument();
    expect(screen.getByText('Focus Soundscape')).toBeInTheDocument();

    // Navigating back to Timer restores view
    fireEvent.click(screen.getByTestId('nav-timer'));
    expect(screen.getByTestId('timer-card')).toBeInTheDocument();
  });

  it('renders all 4 soundscape cards: Rain, Forest, Café, and White Noise', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('nav-soundscape'));

    expect(screen.getByTestId('soundscape-card-rain')).toBeInTheDocument();
    expect(screen.getByTestId('soundscape-card-forest')).toBeInTheDocument();
    expect(screen.getByTestId('soundscape-card-cafe')).toBeInTheDocument();
    expect(screen.getByTestId('soundscape-card-whiteNoise')).toBeInTheDocument();

    expect(screen.getByText('Gentle Rain')).toBeInTheDocument();
    expect(screen.getByText('Forest & Nature')).toBeInTheDocument();
    expect(screen.getByText('Cozy Café')).toBeInTheDocument();
    expect(screen.getByText('Focus White Noise')).toBeInTheDocument();
  });

  it('plays, pauses, and stops soundscapes with accurate status indicators', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('nav-soundscape'));

    // Initially idle
    expect(screen.getByTestId('soundscape-active-label')).toHaveTextContent(
      'No ambient sound playing'
    );

    // Click play on Rain
    const playRainBtn = screen.getByTestId('soundscape-btn-play-rain');
    await act(async () => {
      fireEvent.click(playRainBtn);
    });

    // Now playing label updates
    expect(screen.getByTestId('soundscape-active-label')).toHaveTextContent('Gentle Rain');
    expect(screen.getByTestId('soundscape-card-rain')).toHaveClass('is-playing');
    expect(screen.getByTestId('soundscape-btn-pause-rain')).toBeInTheDocument();

    // Pause rain using card pause button
    const pauseRainBtn = screen.getByTestId('soundscape-btn-pause-rain');
    act(() => {
      fireEvent.click(pauseRainBtn);
    });

    // Shows paused state
    expect(screen.getByTestId('soundscape-active-label')).toHaveTextContent('Paused: Gentle Rain');

    // Resume using quick resume button
    const quickResumeBtn = screen.getByTestId('soundscape-quick-resume');
    await act(async () => {
      fireEvent.click(quickResumeBtn);
    });
    expect(screen.getByTestId('soundscape-active-label')).toHaveTextContent('Now playing: Gentle Rain');

    // Stop all sounds
    const stopAllBtn = screen.getByTestId('soundscape-stop-all-btn');
    act(() => {
      fireEvent.click(stopAllBtn);
    });

    expect(screen.getByTestId('soundscape-active-label')).toHaveTextContent(
      'No ambient sound playing'
    );
  });

  it('adjusts master volume, track volume, and toggles mute', async () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('nav-soundscape'));

    // Master volume slider
    const masterSlider = screen.getByTestId('soundscape-master-volume-slider');
    fireEvent.change(masterSlider, { target: { value: '45' } });
    expect(screen.getByText('45%')).toBeInTheDocument();

    // Track volume slider (Rain)
    const rainVolSlider = screen.getByTestId('soundscape-volume-rain');
    fireEvent.change(rainVolSlider, { target: { value: '85' } });
    expect(screen.getByText('85%')).toBeInTheDocument();

    // Mute toggle button
    const muteBtn = screen.getByTestId('soundscape-mute-btn');
    fireEvent.click(muteBtn);
    expect(muteBtn).toHaveClass('is-muted');

    // Unmute
    fireEvent.click(muteBtn);
    expect(muteBtn).not.toHaveClass('is-muted');
  });

  it('displays alert banner when autoplay is blocked by browser policy', () => {
    const mockState: UseSoundscapeReturn = {
      activeSoundId: null,
      isPlaying: false,
      isMuted: false,
      masterVolume: 0.8,
      volumes: { rain: 0.7, forest: 0.7, cafe: 0.7, whiteNoise: 0.6 },
      enabled: true,
      error: 'Browser autoplay policy blocked audio.',
      isAutoplayBlocked: true,
      lastSelectedId: null,
      playSound: vi.fn(),
      pauseSound: vi.fn(),
      resumeSound: vi.fn(),
      stopAll: vi.fn(),
      setMasterVolume: vi.fn(),
      setTrackVolume: vi.fn(),
      toggleMute: vi.fn(),
      setEnabled: vi.fn(),
      clearError: vi.fn(),
    };

    render(<SoundscapePanel soundscapeState={mockState} />);

    expect(screen.getByTestId('soundscape-error-banner')).toBeInTheDocument();
    expect(screen.getByText(/Browser autoplay policy blocked audio/i)).toBeInTheDocument();

    // Dismiss message
    fireEvent.click(screen.getByLabelText('Dismiss message'));
    expect(mockState.clearError).toHaveBeenCalled();
  });

  it('allows enabling/disabling Soundscape in Settings Modal and hides/shows nav tab', () => {
    render(<App />);

    // Open settings
    fireEvent.click(screen.getByTestId('settings-button'));
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();

    // Toggle soundscape availability checkbox
    const soundscapeToggle = screen.getByTestId('setting-soundscape-toggle');
    expect(soundscapeToggle).toBeChecked();
    fireEvent.click(soundscapeToggle);
    expect(soundscapeToggle).not.toBeChecked();

    // Save preferences
    fireEvent.click(screen.getByTestId('save-settings-button'));

    // Soundscape tab is now hidden
    expect(screen.queryByTestId('nav-soundscape')).not.toBeInTheDocument();
  });
});
