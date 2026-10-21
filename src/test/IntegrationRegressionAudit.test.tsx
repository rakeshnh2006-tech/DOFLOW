import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import App from '../App';
import { TASKS_STORAGE_KEY, ACTIVE_TASK_STORAGE_KEY } from '../utils/taskStorage';
import { SESSION_HISTORY_STORAGE_KEY } from '../utils/statsStorage';
import { PREFERENCES_STORAGE_KEY } from '../utils/settingsStorage';
import { PLANNER_STORAGE_KEY } from '../utils/plannerStorage';
import { SOUNDSCAPE_STORAGE_KEY } from '../utils/soundscapeStorage';
import { HABITS_STORAGE_KEY, HABIT_COMPLETIONS_STORAGE_KEY } from '../utils/habitStorage';
import { DAILY_GOALS_STORAGE_KEY, ACHIEVEMENTS_STORAGE_KEY } from '../utils/goalsStorage';
import type { CompletedSessionRecord } from '../types/stats';

class MockAudioContextForAudit {
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

describe('Doflow Comprehensive Integration & Regression Audit Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    // @ts-expect-error Mock AudioContext in jsdom
    window.AudioContext = MockAudioContextForAudit;
    vi.useFakeTimers();
  });

  afterEach(() => {
    // @ts-expect-error Cleanup AudioContext mock
    delete window.AudioContext;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('1. verifies all original core features (Timer, Modes, Tasks, Stats, Settings) work together', () => {
    render(<App />);

    // 1a. Brand and Tagline Preservation
    expect(screen.getByText('Doflow')).toBeDefined();
    expect(screen.getByText('Find your flow.')).toBeDefined();
    expect(screen.getByText(/Doflow • Find your flow\./)).toBeDefined();

    // 1b. Timer Countdown, Pause, Resume, Reset
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');

    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:50');

    act(() => {
      fireEvent.click(screen.getByTestId('pause-button'));
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'paused');

    act(() => {
      fireEvent.click(screen.getByTestId('reset-button'));
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');

    // 1c. Task Creation & Active Task Selection
    const taskInput = screen.getByTestId('task-input');
    const addTaskBtn = screen.getByTestId('add-task-button');

    // Reject empty
    fireEvent.change(taskInput, { target: { value: '   ' } });
    fireEvent.click(addTaskBtn);
    expect(screen.getByTestId('task-error-message')).toBeDefined();

    // Valid task
    fireEvent.change(taskInput, { target: { value: 'Write integration test' } });
    fireEvent.click(addTaskBtn);

    expect(screen.getAllByText('Write integration test').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('current-focus-goal')).toHaveTextContent('Write integration test');

    // 1d. Settings Modal & Custom Durations
    fireEvent.click(screen.getByTestId('settings-button'));
    expect(screen.getByTestId('settings-modal')).toBeDefined();

    const focusInput = screen.getByTestId('setting-focus-duration');
    fireEvent.change(focusInput, { target: { value: '30' } });
    fireEvent.click(screen.getByTestId('save-settings-button'));

    // Applied to idle timer
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('30:00');
  });

  it('2. verifies timer mode change confirmation prevents accidental loss during running sessions', () => {
    render(<App />);

    // Start timer
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:55');

    // Try to switch to Short Break while running
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    expect(screen.getByTestId('confirm-switch-modal')).toBeDefined();

    // Cancel switch - countdown continues untouched
    fireEvent.click(screen.getByTestId('cancel-switch-button'));
    expect(screen.queryByTestId('confirm-switch-modal')).toBeNull();
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:55');

    // Try again and confirm switch
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    fireEvent.click(screen.getByTestId('confirm-switch-button'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('05:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');
  });

  it('3. verifies timer session completion records exactly once and updates daily stats & goals', () => {
    render(<App />);

    // Verify 0 completed sessions at start
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('0');

    // Start and advance timer to completion (25 min = 1500000ms)
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    // Exactly 1 session recorded, 25 focus minutes
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('25');

    // Navigate to Goals & Achievements
    fireEvent.click(screen.getByTestId('nav-goals'));

    // Goal cards reflect 25 min and 1 session
    const minutesCard = screen.getByTestId('goal-card-minutes');
    expect(within(minutesCard).getByText('25')).toBeDefined();
    expect(within(minutesCard).getByText('35 min to go')).toBeDefined();

    const sessionsCard = screen.getByTestId('goal-card-sessions');
    expect(within(sessionsCard).getByText('1')).toBeDefined();
    expect(within(sessionsCard).getByText('3 sessions to go')).toBeDefined();

    // "First Step" milestone unlocked!
    expect(screen.getByTestId('achievement-unlocked-first_focus_session')).toBeDefined();
  });

  it('4. verifies background timer persistence across navigation between all views', () => {
    render(<App />);

    // Start timer in Timer view
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
      vi.advanceTimersByTime(12000); // 12 seconds
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:48');

    // Navigate to Daily Planner
    fireEvent.click(screen.getByTestId('nav-planner'));
    expect(screen.getByTestId('daily-planner-page')).toBeDefined();

    // Advance 10 more seconds while in Daily Planner view
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Navigate to Weekly Analytics
    fireEvent.click(screen.getByTestId('nav-analytics'));
    expect(screen.getByTestId('weekly-analytics-page')).toBeDefined();

    // Advance 5 more seconds while in Analytics view
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Navigate to Habits
    fireEvent.click(screen.getByTestId('nav-habits'));
    expect(screen.getByTestId('habit-manager-page')).toBeDefined();

    // Navigate to Goals
    fireEvent.click(screen.getByTestId('nav-goals'));
    expect(screen.getByTestId('goals-manager-page')).toBeDefined();

    // Navigate to Soundscape
    fireEvent.click(screen.getByTestId('nav-soundscape'));
    expect(screen.getByTestId('soundscape-panel')).toBeDefined();

    // Return to Timer view
    fireEvent.click(screen.getByTestId('nav-timer'));
    // Total elapsed: 12 + 10 + 5 = 27 seconds -> 25:00 - 0:27 = 24:33
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:33');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');
  });

  it('5. verifies Daily Planner task synchronization with Task Manager without duplicate data', () => {
    render(<App />);

    // Add a task in Task Manager
    const taskInput = screen.getByTestId('task-input');
    fireEvent.change(taskInput, { target: { value: 'Shared Synchronized Task' } });
    fireEvent.click(screen.getByTestId('add-task-button'));

    // Get the created task from localStorage
    const savedTasks = JSON.parse(localStorage.getItem(TASKS_STORAGE_KEY) || '[]');
    expect(savedTasks.length).toBe(1);
    const taskId = savedTasks[0].id;

    // Navigate to Daily Planner
    fireEvent.click(screen.getByTestId('nav-planner'));

    // Switch to "Pick from Doflow Tasks" tab
    fireEvent.click(screen.getByTestId('planner-tab-existing-task'));

    // Select existing task from dropdown
    const select = screen.getByTestId('planner-select-existing-task');
    fireEvent.change(select, { target: { value: taskId } });

    // Save planned task
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    // Displayed in planner
    expect(screen.getByTestId('planned-tasks-list')).toHaveTextContent('Shared Synchronized Task');

    // Toggle completion in Planner
    const plannerCheckbox = screen.getByTestId(/^planner-task-checkbox-/);
    fireEvent.click(plannerCheckbox);

    // Navigate back to Timer & Task Manager
    fireEvent.click(screen.getByTestId('nav-timer'));

    // Task in Task Manager is also marked completed!
    const taskCheckbox = screen.getByTestId(/^task-checkbox-/);
    expect(taskCheckbox).toBeDefined();

    // Completed tasks stats reflect 1 task
    expect(screen.getByTestId('stat-completed-tasks-value')).toHaveTextContent('1');
  });

  it('6. verifies Weekly Analytics uses genuine records, excludes breaks, and does not double-count', () => {
    // Current local calendar date in format YYYY-MM-DD
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;

    const mockSessions: CompletedSessionRecord[] = [
      {
        id: 'session-work-1',
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
        completedAt: Date.now() - 3600000,
        localDate: today,
      },
      {
        id: 'session-break-1',
        mode: 'shortBreak',
        durationMs: 5 * 60 * 1000,
        completedAt: Date.now() - 1800000,
        localDate: today,
      },
      {
        id: 'session-work-2',
        mode: 'focus',
        durationMs: 30 * 60 * 1000,
        completedAt: Date.now() - 60000,
        localDate: today,
      },
    ];
    localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(mockSessions));

    render(<App />);

    // Navigate to Weekly Analytics
    fireEvent.click(screen.getByTestId('nav-analytics'));

    // Total focus time should be 25 + 30 = 55 minutes (Break excluded!)
    expect(screen.getByTestId('metric-total-focus')).toHaveTextContent('55 min');
    // Completed focus sessions should be 2 (Break excluded!)
    expect(screen.getByTestId('metric-focus-sessions')).toHaveTextContent('2');
  });

  it('7. verifies Soundscape master and individual controls work without crashing', async () => {
    render(<App />);

    // Navigate to Soundscape
    fireEvent.click(screen.getByTestId('nav-soundscape'));
    expect(screen.getByTestId('soundscape-panel')).toBeDefined();

    // Play rain
    const rainPlayBtn = screen.getByTestId('soundscape-btn-play-rain');
    await act(async () => {
      fireEvent.click(rainPlayBtn);
    });

    // Playing indicator appears in Header
    expect(screen.getByTitle('Audio playing')).toBeDefined();

    // Stop all sounds
    const stopAllBtn = screen.getByTestId('soundscape-stop-all-btn');
    fireEvent.click(stopAllBtn);

    // Playing indicator cleared
    expect(screen.queryByTitle('Audio playing')).toBeNull();
  });

  it('8. verifies Habit streaks respect schedules and unscheduled days', () => {
    render(<App />);

    // Navigate to Habits
    fireEvent.click(screen.getByTestId('nav-habits'));

    // Add a weekday habit
    fireEvent.click(screen.getByTestId('create-habit-btn'));
    fireEvent.change(screen.getByTestId('habit-name-input'), { target: { value: 'Morning Coding' } });
    fireEvent.click(screen.getByTestId('habit-freq-weekdays'));
    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));

    expect(screen.getByText('Morning Coding')).toBeDefined();
    expect(screen.getByText('Weekdays (Mon–Fri)')).toBeDefined();

    // Toggle today's completion if scheduled
    const checkBtn = screen.queryByTestId(/^habit-check-/);
    if (checkBtn) {
      fireEvent.click(checkBtn);
      const streakBadge = screen.getByTestId(/^habit-streak-current-/);
      expect(streakBadge).toHaveTextContent('1');
    } else {
      // If today is a weekend rest day, rest pill is displayed
      expect(screen.getByText('Rest')).toBeDefined();
    }
  });

  it('9. verifies local persistence survives refreshes and corrupted storage does not crash', () => {
    // Inject corrupt JSON into storage keys
    localStorage.setItem(TASKS_STORAGE_KEY, '{invalid-json');
    localStorage.setItem(ACTIVE_TASK_STORAGE_KEY, '');
    localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, '[not, valid, array');
    localStorage.setItem(PREFERENCES_STORAGE_KEY, '{"focusDurationMinutes": -99}');
    localStorage.setItem(PLANNER_STORAGE_KEY, 'null');
    localStorage.setItem(SOUNDSCAPE_STORAGE_KEY, 'undefined');
    localStorage.setItem(HABITS_STORAGE_KEY, '{"not": "array"}');
    localStorage.setItem(HABIT_COMPLETIONS_STORAGE_KEY, 'corrupted');
    localStorage.setItem(DAILY_GOALS_STORAGE_KEY, '{"focusMinutes": "invalid"}');
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, '12345');

    // Application renders safely with clean defaults
    expect(() => render(<App />)).not.toThrow();

    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');
    expect(screen.getByTestId('daily-stats-section')).toBeDefined();
    expect(screen.getByTestId('task-input')).toBeDefined();

    // Check all pages render safely without throwing
    fireEvent.click(screen.getByTestId('nav-planner'));
    expect(screen.getByTestId('daily-planner-page')).toBeDefined();

    fireEvent.click(screen.getByTestId('nav-analytics'));
    expect(screen.getByTestId('weekly-analytics-page')).toBeDefined();

    fireEvent.click(screen.getByTestId('nav-habits'));
    expect(screen.getByTestId('habit-manager-page')).toBeDefined();

    fireEvent.click(screen.getByTestId('nav-goals'));
    expect(screen.getByTestId('goals-manager-page')).toBeDefined();

    fireEvent.click(screen.getByTestId('nav-soundscape'));
    expect(screen.getByTestId('soundscape-panel')).toBeDefined();
  });

  it('10. verifies light and dark themes toggle consistently and persist', () => {
    render(<App />);

    // Default theme is light
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    // Click theme toggle in Header
    const themeBtn = screen.getByTestId('header-theme-toggle');
    fireEvent.click(themeBtn);

    // Switches to dark
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    // Persisted in preferences
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}');
    expect(saved.theme).toBe('dark');

    // Click again to switch back
    fireEvent.click(themeBtn);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
