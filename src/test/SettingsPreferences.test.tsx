import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { PREFERENCES_STORAGE_KEY } from '../utils/settingsStorage';
import { playCompletionSound } from '../utils/sound';

describe('Feature 5: Settings and User Preferences Integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // 1. Settings Modal Opening and Closing
  it('opens settings modal with default preferences and closes cleanly on cancel or close button', () => {
    render(<App />);

    // Initially modal is not visible
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();

    // Click settings button in header
    fireEvent.click(screen.getByTestId('settings-button'));
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();

    // Default values are displayed
    expect(screen.getByTestId('setting-focus-duration')).toHaveValue(25);
    expect(screen.getByTestId('setting-short-break-duration')).toHaveValue(5);
    expect(screen.getByTestId('setting-long-break-duration')).toHaveValue(15);
    expect(screen.getByTestId('theme-toggle-light')).toHaveClass('active');
    expect(screen.getByTestId('setting-sound-toggle')).toBeChecked();

    // Close via cancel button
    fireEvent.click(screen.getByTestId('cancel-settings-button'));
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
  });

  it('closes settings modal on Escape key press', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('settings-button'));
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
  });

  // 2. Duration Validation Tests
  it('validates duration inputs and displays clear errors for invalid values', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('settings-button'));

    const focusInput = screen.getByTestId('setting-focus-duration');
    const saveButton = screen.getByTestId('save-settings-button');

    // Test zero duration
    fireEvent.change(focusInput, { target: { value: '0' } });
    fireEvent.click(saveButton);
    expect(screen.getByTestId('settings-error-message')).toHaveTextContent(
      'Focus duration must be between 1 and 120 minutes.'
    );
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();

    // Test negative duration
    fireEvent.change(focusInput, { target: { value: '-5' } });
    fireEvent.click(saveButton);
    expect(screen.getByTestId('settings-error-message')).toHaveTextContent(
      'Focus duration must be between 1 and 120 minutes.'
    );

    // Test duration > 120
    fireEvent.change(focusInput, { target: { value: '121' } });
    fireEvent.click(saveButton);
    expect(screen.getByTestId('settings-error-message')).toHaveTextContent(
      'Focus duration must be between 1 and 120 minutes.'
    );

    // Test empty duration
    fireEvent.change(focusInput, { target: { value: '' } });
    fireEvent.click(saveButton);
    expect(screen.getByTestId('settings-error-message')).toHaveTextContent(
      'Focus duration cannot be empty.'
    );

    // Test decimal duration
    fireEvent.change(focusInput, { target: { value: '25.5' } });
    fireEvent.click(saveButton);
    expect(screen.getByTestId('settings-error-message')).toHaveTextContent(
      'Focus duration must be a whole number.'
    );

    // Test short break validation
    fireEvent.change(focusInput, { target: { value: '25' } });
    const shortBreakInput = screen.getByTestId('setting-short-break-duration');
    fireEvent.change(shortBreakInput, { target: { value: '150' } });
    fireEvent.click(saveButton);
    expect(screen.getByTestId('settings-error-message')).toHaveTextContent(
      'Short break duration must be between 1 and 120 minutes.'
    );

    // Test long break validation
    fireEvent.change(shortBreakInput, { target: { value: '5' } });
    const longBreakInput = screen.getByTestId('setting-long-break-duration');
    fireEvent.change(longBreakInput, { target: { value: '0' } });
    fireEvent.click(saveButton);
    expect(screen.getByTestId('settings-error-message')).toHaveTextContent(
      'Long break duration must be between 1 and 120 minutes.'
    );
  });

  // 3. Saving and Restoring Preferences
  it('saves valid preferences to localStorage and updates countdown display when idle', () => {
    render(<App />);

    // Initial display is 25:00
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');

    // Open settings and configure 50m focus, 10m short break, 20m long break
    fireEvent.click(screen.getByTestId('settings-button'));

    fireEvent.change(screen.getByTestId('setting-focus-duration'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByTestId('setting-short-break-duration'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByTestId('setting-long-break-duration'), {
      target: { value: '20' },
    });

    fireEvent.click(screen.getByTestId('save-settings-button'));

    // Modal closed
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();

    // Idle countdown display updated to 50:00 immediately
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('50:00');

    // Switching to Short Break mode loads configured 10:00
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('10:00');

    // Switching to Long Break mode loads configured 20:00
    fireEvent.click(screen.getByTestId('mode-tab-longBreak'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('20:00');

    // Verify localStorage persistence
    const saved = JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}');
    expect(saved.focusDurationMinutes).toBe(50);
    expect(saved.shortBreakDurationMinutes).toBe(10);
    expect(saved.longBreakDurationMinutes).toBe(20);
  });

  it('restores saved preferences from localStorage on initial render', () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        focusDurationMinutes: 45,
        shortBreakDurationMinutes: 8,
        longBreakDurationMinutes: 25,
        theme: 'dark',
        soundEnabled: false,
      })
    );

    render(<App />);

    // Countdown initialized to saved 45:00
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('45:00');

    // Document attribute set to dark
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Open settings and check restored inputs
    fireEvent.click(screen.getByTestId('settings-button'));
    expect(screen.getByTestId('setting-focus-duration')).toHaveValue(45);
    expect(screen.getByTestId('setting-short-break-duration')).toHaveValue(8);
    expect(screen.getByTestId('setting-long-break-duration')).toHaveValue(25);
    expect(screen.getByTestId('theme-toggle-dark')).toHaveClass('active');
    expect(screen.getByTestId('setting-sound-toggle')).not.toBeChecked();
  });

  // 4. Theme Toggling
  it('toggles theme via quick header button and updates document element data-theme attribute', () => {
    render(<App />);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Click header theme toggle
    fireEvent.click(screen.getByTestId('header-theme-toggle'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Click again to switch back
    fireEvent.click(screen.getByTestId('header-theme-toggle'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('changes theme inside settings modal', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('settings-button'));
    fireEvent.click(screen.getByTestId('theme-toggle-dark'));
    fireEvent.click(screen.getByTestId('save-settings-button'));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  // 5. Running-Timer Behavior
  it('asks user whether to apply duration change to next session or reset current session when timer is running', () => {
    render(<App />);

    // Start timer (25:00)
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Advance 10 seconds -> 24:50
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:50');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    // Open settings while running and change focus duration to 35m
    fireEvent.click(screen.getByTestId('settings-button'));
    fireEvent.change(screen.getByTestId('setting-focus-duration'), {
      target: { value: '35' },
    });
    fireEvent.click(screen.getByTestId('save-settings-button'));

    // Settings modal closes, RunningTimerSettingModal opens
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('running-timer-setting-modal')).toBeInTheDocument();

    // Option A: Choose "Apply to Next Session"
    fireEvent.click(screen.getByTestId('apply-next-session-button'));
    expect(screen.queryByTestId('running-timer-setting-modal')).not.toBeInTheDocument();

    // Running timer is NOT interrupted and keeps counting down from 24:50
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:50');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:45');
  });

  it('allows user to reset current running session with new duration', () => {
    render(<App />);

    // Start timer
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:45');

    // Open settings and change duration to 30m
    fireEvent.click(screen.getByTestId('settings-button'));
    fireEvent.change(screen.getByTestId('setting-focus-duration'), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByTestId('save-settings-button'));

    // Option B: Choose "Reset Current Session"
    fireEvent.click(screen.getByTestId('apply-current-session-button'));
    expect(screen.queryByTestId('running-timer-setting-modal')).not.toBeInTheDocument();

    // Timer is reset to idle with the newly configured 30:00 duration
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('30:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');
    expect(screen.getByTestId('start-button')).toBeEnabled();
  });

  // 6. Sound Preferences & Error Safety
  it('allows disabling sound and previewing chime', async () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('settings-button'));

    const soundToggle = screen.getByTestId('setting-sound-toggle');
    expect(soundToggle).toBeChecked();

    // Uncheck sound
    fireEvent.click(soundToggle);
    expect(soundToggle).not.toBeChecked();

    // Click preview chime button (should not throw even without browser AudioContext)
    const testChimeBtn = screen.getByTestId('test-sound-button');
    expect(testChimeBtn).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(testChimeBtn);
    });

    // Save with sound disabled
    fireEvent.click(screen.getByTestId('save-settings-button'));
    const saved = JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}');
    expect(saved.soundEnabled).toBe(false);
  });

  it('safely handles blocked or failing audio playback when timer completes', async () => {
    // Save short duration so countdown completes in 1 minute
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        focusDurationMinutes: 1,
        shortBreakDurationMinutes: 5,
        longBreakDurationMinutes: 15,
        theme: 'light',
        soundEnabled: true,
      })
    );

    render(<App />);

    // Start timer (01:00)
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Advance 60 seconds to completion
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // Timer completes successfully without error
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'completed');

    // Daily stats should be recorded (1 session completed)
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('1');
  });

  it('direct unit test: playCompletionSound safely returns false if AudioContext fails or is blocked', async () => {
    // In jsdom without AudioContext
    const result = await playCompletionSound();
    expect(result).toBe(false);

    // Mock AudioContext where resume rejects (autoplay blocked)
    class MockAudioContext {
      state = 'suspended';
      resume = vi.fn().mockRejectedValue(new Error('Autoplay blocked'));
      close = vi.fn();
    }
    // @ts-expect-error Mocking window.AudioContext for test
    window.AudioContext = MockAudioContext;

    const blockedResult = await playCompletionSound();
    expect(blockedResult).toBe(false);

    // @ts-expect-error Cleanup
    delete window.AudioContext;
  });
});
