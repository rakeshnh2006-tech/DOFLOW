import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App';
import {
  saveSessionHistoryToStorage,
  getLocalDateString,
} from '../utils/statsStorage';
import type { CompletedSessionRecord } from '../types/stats';

describe('FEATURE 4: Daily Productivity Statistics', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // 1. Initial State (No Activity)
  it('displays zero statistics and empty activity note when no sessions or tasks are completed', () => {
    render(<App />);

    expect(screen.getByTestId('daily-stats-section')).toBeInTheDocument();
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('0');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('0m');
    expect(screen.getByTestId('stat-completed-tasks-value')).toHaveTextContent('0');
    expect(screen.getByTestId('stats-empty-note')).toHaveTextContent(/No focus activity recorded today yet/i);
  });

  // 2. Incomplete Sessions (Paused, Reset, Abandoned) are NEVER counted
  it('never counts paused, reset, or incomplete focus sessions as completed', () => {
    render(<App />);

    // Start Focus
    const startButton = screen.getByTestId('start-button');
    act(() => {
      fireEvent.click(startButton);
    });

    // Advance 10 minutes
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('15:00');

    // Pause timer
    act(() => {
      fireEvent.click(screen.getByTestId('pause-button'));
    });

    // Stats must still be 0!
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('0');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('0m');

    // Reset timer
    act(() => {
      fireEvent.click(screen.getByTestId('reset-button'));
    });

    // Stats must still be 0!
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('0');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('0m');
  });

  // 3. Completed Focus Session counts exactly once & records actual duration
  it('counts a focus session only when it reaches zero and records exact duration', () => {
    render(<App />);

    // Start Focus (default 25 minutes = 1,500,000 ms)
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Advance to 0 (25 minutes)
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'completed');

    // Focus session count = 1, focus time = 25m
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('25m');
    expect(screen.queryByTestId('stats-empty-note')).not.toBeInTheDocument();

    // Advancing clock further must NOT double-count the completed session
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('25m');
  });

  // 4. Break Exclusion (Breaks are NOT counted towards focus stats)
  it('does NOT count completed break sessions towards focus sessions or focus time', () => {
    render(<App />);

    // Switch to Short Break (5 minutes) while idle
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('05:00');

    // Start Short Break
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Complete the 5-minute break
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:00');

    // Break is completed, but Focus stats must still remain 0!
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('0');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('0m');

    // Switch to Long Break (15 minutes)
    fireEvent.click(screen.getByTestId('mode-tab-longBreak'));
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:00');

    // Long break is completed, but Focus stats must STILL remain 0!
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('0');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('0m');
  });

  // 5. Task Totals Derived from Saved Tasks
  it('derives completed task totals dynamically from task records', () => {
    render(<App />);

    const input = screen.getByTestId('task-input');
    const addButton = screen.getByTestId('add-task-button');

    // Add 2 tasks
    fireEvent.change(input, { target: { value: 'Task Alpha' } });
    fireEvent.click(addButton);

    fireEvent.change(input, { target: { value: 'Task Beta' } });
    fireEvent.click(addButton);

    // Completed tasks metric is 0
    expect(screen.getByTestId('stat-completed-tasks-value')).toHaveTextContent('0');

    // Complete Task Alpha
    const checkboxAlpha = screen.getByRole('checkbox', { name: /Mark "Task Alpha" complete/i });
    fireEvent.click(checkboxAlpha);

    // Completed tasks metric updates to 1
    expect(screen.getByTestId('stat-completed-tasks-value')).toHaveTextContent('1');

    // Complete Task Beta
    const checkboxBeta = screen.getByRole('checkbox', { name: /Mark "Task Beta" complete/i });
    fireEvent.click(checkboxBeta);

    // Completed tasks metric updates to 2
    expect(screen.getByTestId('stat-completed-tasks-value')).toHaveTextContent('2');

    // Undo completion of Task Alpha
    fireEvent.click(checkboxAlpha);
    expect(screen.getByTestId('stat-completed-tasks-value')).toHaveTextContent('1');
  });

  // 6. Page Refresh Persistence
  it('persists completed session history in localStorage and calculates daily totals after refresh', () => {
    const { unmount } = render(<App />);

    // Complete 1 focus session (25 minutes)
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('25m');

    // Simulate page refresh (unmount and remount)
    unmount();
    render(<App />);

    // Daily totals must be preserved after refresh
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('25m');
  });

  // 7. Local Calendar Date Boundaries
  it('aggregates totals strictly based on local calendar date and excludes yesterday sessions', () => {
    const today = getLocalDateString(Date.now());

    // Compute yesterday's local date string
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalDateString(yesterdayDate.getTime());

    // Pre-populate storage with 2 focus sessions from yesterday, and 1 from today
    const historicalRecords: CompletedSessionRecord[] = [
      {
        id: 'yesterday-1',
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
        completedAt: yesterdayDate.getTime(),
        localDate: yesterday,
      },
      {
        id: 'yesterday-2',
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
        completedAt: yesterdayDate.getTime() + 3000,
        localDate: yesterday,
      },
      {
        id: 'today-1',
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
        completedAt: Date.now(),
        localDate: today,
      },
    ];

    saveSessionHistoryToStorage(historicalRecords);

    render(<App />);

    // Today's statistics must count ONLY today's session (1 session, 25m), NOT yesterday's!
    expect(screen.getByTestId('stat-focus-sessions-value')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-focus-time-value')).toHaveTextContent('25m');
  });
});
