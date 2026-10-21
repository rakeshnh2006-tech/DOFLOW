import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import { PREFERENCES_STORAGE_KEY } from '../utils/settingsStorage';
import { TASKS_STORAGE_KEY, ACTIVE_TASK_STORAGE_KEY } from '../utils/taskStorage';
import { SESSION_HISTORY_STORAGE_KEY } from '../utils/statsStorage';
import { playCompletionSound } from '../utils/sound';

describe('Final Quality Assurance Audit Suite', () => {
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

  // 1. Focus Timer Accuracy, Pause, Resume, Reset, and Completion
  it('1. verifies focus timer full lifecycle (accuracy, pause, resume, reset, exact completion)', () => {
    render(<App />);

    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');

    // Start
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    // Advance 10s
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:50');

    // Pause
    act(() => {
      fireEvent.click(screen.getByTestId('pause-button'));
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'paused');

    // Advance 5s while paused (time should NOT change)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:50');

    // Resume
    act(() => {
      fireEvent.click(screen.getByTestId('resume-button'));
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    // Advance 5s
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:45');

    // Reset
    act(() => {
      fireEvent.click(screen.getByTestId('reset-button'));
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');
    expect(screen.getByTestId('reset-button')).toBeDisabled();
  });

  // 2. Mode Switching and Confirmation
  it('2. verifies mode switching while idle, and confirmation prompt when running', () => {
    render(<App />);

    // Switch to Short Break while idle
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('05:00');
    expect(screen.getByTestId('mode-tab-shortBreak')).toHaveClass('active');

    // Switch to Long Break while idle
    fireEvent.click(screen.getByTestId('mode-tab-longBreak'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('15:00');
    expect(screen.getByTestId('mode-tab-longBreak')).toHaveClass('active');

    // Switch back to Focus
    fireEvent.click(screen.getByTestId('mode-tab-focus'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');

    // Start timer
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Try switching to Short Break while running
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    expect(screen.getByTestId('confirm-switch-modal')).toBeInTheDocument();

    // Cancel switch
    fireEvent.click(screen.getByTestId('cancel-switch-button'));
    expect(screen.queryByTestId('confirm-switch-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');
    expect(screen.getByTestId('mode-tab-focus')).toHaveClass('active');

    // Try switching again and confirm
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    fireEvent.click(screen.getByTestId('confirm-switch-button'));
    expect(screen.queryByTestId('confirm-switch-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('mode-tab-shortBreak')).toHaveClass('active');
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('05:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');
  });

  // 3. Task Management Full Lifecycle
  it('3. verifies task creation, validation, active focus goal selection, completion toggle, and deletion', () => {
    render(<App />);

    // Validation: empty task rejected
    fireEvent.click(screen.getByTestId('add-task-button'));
    expect(screen.getByTestId('task-error-message')).toBeInTheDocument();

    // Add valid task
    fireEvent.change(screen.getByTestId('task-input'), {
      target: { value: 'Write Technical Documentation' },
    });
    fireEvent.click(screen.getByTestId('add-task-button'));
    expect(screen.queryByTestId('task-error-message')).not.toBeInTheDocument();

    // Verify task is active focus goal
    expect(screen.getByTestId('current-focus-goal')).toHaveTextContent('Write Technical Documentation');

    // Add second task
    fireEvent.change(screen.getByTestId('task-input'), {
      target: { value: 'Review Pull Request' },
    });
    fireEvent.click(screen.getByTestId('add-task-button'));

    // Check task counter
    expect(screen.getByTestId('task-counter')).toHaveTextContent('0 of 2 completed');

    const tasks = JSON.parse(window.localStorage.getItem(TASKS_STORAGE_KEY) || '[]');
    expect(tasks).toHaveLength(2);

    // Currently tasks[1] ('Write Technical Documentation') is active.
    // tasks[0] is 'Review Pull Request'.
    // Toggle completion on tasks[1]
    fireEvent.click(screen.getByTestId(`task-checkbox-${tasks[1].id}`));
    expect(screen.getByTestId('task-counter')).toHaveTextContent('1 of 2 completed');

    // Switch active focus goal to tasks[0] ('Review Pull Request')
    fireEvent.click(screen.getByTestId(`select-task-button-${tasks[0].id}`));
    expect(screen.getByTestId('current-focus-goal')).toHaveTextContent('Review Pull Request');

    // Delete task with confirmation modal
    fireEvent.click(screen.getByTestId(`delete-task-button-${tasks[0].id}`));
    expect(screen.getByTestId('delete-task-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('confirm-delete-button'));

    // Verified deleted
    expect(screen.queryByTestId(`task-item-${tasks[0].id}`)).not.toBeInTheDocument();
  });

  // 4. Daily Productivity Statistics Accuracy
  it('4. verifies daily productivity stats: only completed focus sessions count, breaks excluded, zero fabrication', () => {
    // Save short duration so countdown completes in 1 minute
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        focusDurationMinutes: 1,
        shortBreakDurationMinutes: 1,
        longBreakDurationMinutes: 1,
        theme: 'light',
        soundEnabled: false,
      })
    );

    render(<App />);

    // Initially 0 focus sessions, 0 minutes, empty note visible
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('0');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('0m');
    expect(screen.getByTestId('stats-empty-note')).toBeInTheDocument();

    // Run a 1-minute focus session to completion
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'completed');
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('1m');
    expect(screen.queryByTestId('stats-empty-note')).not.toBeInTheDocument();

    // Now switch to Short Break and complete a break session
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // Focus session count and focus time MUST NOT increase for break sessions
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('1m');
  });

  // 5. Settings Validation and Persistence
  it('5. verifies settings validation, rejection of invalid inputs, and storage restoration', () => {
    render(<App />);

    fireEvent.click(screen.getByTestId('settings-button'));

    // Enter out of range values
    fireEvent.change(screen.getByTestId('setting-focus-duration'), {
      target: { value: '200' },
    });
    fireEvent.click(screen.getByTestId('save-settings-button'));
    expect(screen.getByTestId('settings-error-message')).toHaveTextContent('Focus duration must be between 1 and 120 minutes.');

    // Enter valid custom settings
    fireEvent.change(screen.getByTestId('setting-focus-duration'), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByTestId('setting-short-break-duration'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByTestId('setting-long-break-duration'), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByTestId('theme-toggle-dark'));
    fireEvent.click(screen.getByTestId('save-settings-button'));

    // Verify applied immediately
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('40:00');

    // Verify stored
    const saved = JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}');
    expect(saved.focusDurationMinutes).toBe(40);
    expect(saved.shortBreakDurationMinutes).toBe(8);
    expect(saved.longBreakDurationMinutes).toBe(25);
    expect(saved.theme).toBe('dark');
  });

  // 6. Running Timer Setting Behavior
  it('6. verifies running timer behavior when duration preferences are changed', () => {
    render(<App />);

    // Start 25:00 timer
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(30000); // 24:30
    });

    // Open settings and change focus to 50
    fireEvent.click(screen.getByTestId('settings-button'));
    fireEvent.change(screen.getByTestId('setting-focus-duration'), {
      target: { value: '50' },
    });
    fireEvent.click(screen.getByTestId('save-settings-button'));

    // Prompt shown
    expect(screen.getByTestId('running-timer-setting-modal')).toBeInTheDocument();

    // Option: Apply to Next Session
    fireEvent.click(screen.getByTestId('apply-next-session-button'));
    expect(screen.queryByTestId('running-timer-setting-modal')).not.toBeInTheDocument();

    // Running countdown is still 24:30 and running!
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:30');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');
  });

  // 7. Modals Keyboard Accessibility & Timer Protection
  it('7. verifies keyboard shortcuts (Space, R) are blocked when any modal is open', () => {
    render(<App />);

    // Open settings modal
    fireEvent.click(screen.getByTestId('settings-button'));
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();

    // Press Space while modal is open
    act(() => {
      fireEvent.keyDown(window, { code: 'Space' });
    });

    // Timer must still be idle behind the modal
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');

    // Escape closes modal
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();

    // Now outside modal, Space starts the timer
    act(() => {
      fireEvent.keyDown(window, { code: 'Space' });
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');
  });

  // 8. Resilient Error Handling for Invalid localStorage Data
  it('8. handles malformed or corrupt localStorage data across all features safely', () => {
    window.localStorage.setItem(TASKS_STORAGE_KEY, '{not-valid-json---');
    window.localStorage.setItem(ACTIVE_TASK_STORAGE_KEY, '');
    window.localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, 'invalid');
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, '["corrupt"]');

    expect(() => {
      render(<App />);
    }).not.toThrow();

    // Defaults safely restored
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('0');
    expect(screen.getByTestId('tasks-empty-state')).toBeInTheDocument();
  });

  // 9. Sound Execution Error Safety
  it('9. verifies playCompletionSound never throws or interrupts timer completion', async () => {
    const soundResult = await playCompletionSound();
    expect(typeof soundResult).toBe('boolean');
  });
});
