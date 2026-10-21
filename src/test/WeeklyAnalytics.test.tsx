import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { WeeklyAnalytics } from '../components/WeeklyAnalytics';
import type { CompletedSessionRecord } from '../types/stats';
import type { Task } from '../types/task';
import { getLocalDateString } from '../utils/statsStorage';

describe('Feature 7: Weekly Productivity Analytics Integration Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('navigates to the Analytics view using the header navigation tab', () => {
    render(<App />);

    // Initially on Timer view
    expect(screen.getByTestId('timer-card')).toBeInTheDocument();

    // Click Analytics nav button
    const analyticsNavBtn = screen.getByTestId('nav-analytics');
    fireEvent.click(analyticsNavBtn);

    // Analytics page is visible
    expect(screen.getByTestId('weekly-analytics-page')).toBeInTheDocument();
    expect(screen.getByText('Weekly Analytics')).toBeInTheDocument();

    // Navigating back to Timer preserves view
    fireEvent.click(screen.getByTestId('nav-timer'));
    expect(screen.getByTestId('timer-card')).toBeInTheDocument();
  });

  it('displays empty state with start focus button when no activity is recorded', () => {
    render(<WeeklyAnalytics sessionHistory={[]} tasks={[]} />);

    expect(screen.getByTestId('analytics-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No Focus Activity Recorded Yet')).toBeInTheDocument();
    expect(screen.getByTestId('metric-total-focus')).toHaveTextContent('0 min');
    expect(screen.getByTestId('metric-focus-sessions')).toHaveTextContent('0');
    expect(screen.getByTestId('metric-completed-tasks')).toHaveTextContent('0');
    expect(screen.getByTestId('metric-daily-average')).toHaveTextContent('0m / day');
    expect(screen.getByTestId('metric-most-productive-day')).toHaveTextContent('—');
  });

  it('calculates metrics, bar chart, and breakdown accurately from recorded sessions', () => {
    const todayStr = getLocalDateString();

    const sampleHistory: CompletedSessionRecord[] = [
      {
        id: 'sess-1',
        mode: 'focus',
        durationMs: 30 * 60 * 1000,
        completedAt: Date.now(),
        localDate: todayStr,
      },
      {
        id: 'sess-2',
        mode: 'focus',
        durationMs: 45 * 60 * 1000,
        completedAt: Date.now(),
        localDate: todayStr,
      },
      // Short break must be excluded
      {
        id: 'sess-3',
        mode: 'shortBreak',
        durationMs: 5 * 60 * 1000,
        completedAt: Date.now(),
        localDate: todayStr,
      },
    ];

    const sampleTasks: Task[] = [
      {
        id: 'task-1',
        title: 'Complete Project Report',
        completed: true,
        createdAt: Date.now(),
        completedAt: Date.now(),
      },
      {
        id: 'task-2',
        title: 'Review PRs',
        completed: false, // Incomplete should not count
        createdAt: Date.now(),
      },
    ];

    render(<WeeklyAnalytics sessionHistory={sampleHistory} tasks={sampleTasks} />);

    // Total focus = 30 + 45 = 75 min = "1h 15m"
    expect(screen.getByTestId('metric-total-focus')).toHaveTextContent('1h 15m');
    expect(screen.getByTestId('metric-focus-sessions')).toHaveTextContent('2');
    expect(screen.getByTestId('metric-completed-tasks')).toHaveTextContent('1');

    // Bar chart should be rendered
    expect(screen.getByTestId('weekly-bar-chart')).toBeInTheDocument();

    // Daily breakdown table should display
    expect(screen.getByTestId('daily-breakdown-section')).toBeInTheDocument();
    expect(screen.getByTestId(`daily-breakdown-row-${todayStr}`)).toBeInTheDocument();
  });

  it('switches between This Week, Last Week, and Custom Range filters', () => {
    render(<WeeklyAnalytics sessionHistory={[]} tasks={[]} />);

    const thisWeekBtn = screen.getByTestId('range-this-week');
    const lastWeekBtn = screen.getByTestId('range-last-week');
    const customBtn = screen.getByTestId('range-custom');

    expect(thisWeekBtn).toHaveClass('active');

    // Switch to Last Week
    fireEvent.click(lastWeekBtn);
    expect(lastWeekBtn).toHaveClass('active');
    expect(thisWeekBtn).not.toHaveClass('active');

    // Switch to Custom Range
    fireEvent.click(customBtn);
    expect(customBtn).toHaveClass('active');
    expect(screen.getByTestId('custom-range-picker')).toBeInTheDocument();

    // Modify custom start and end inputs
    const startInput = screen.getByTestId('custom-start-input');
    const endInput = screen.getByTestId('custom-end-input');

    fireEvent.change(startInput, { target: { value: '2026-10-01' } });
    fireEvent.change(endInput, { target: { value: '2026-10-05' } });

    expect(screen.getByTestId('analytics-range-display')).toHaveTextContent('Oct 1 – 5, 2026');
  });

  it('displays week-over-week comparison when previous week records exist', () => {
    // Current date
    const now = new Date();
    // 7 days ago (in last week)
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    const lastWeekDate = getLocalDateString(sevenDaysAgo.getTime());
    const todayDate = getLocalDateString(now.getTime());

    const historyWithPreviousWeek: CompletedSessionRecord[] = [
      // Last week: 50 min
      {
        id: 's-prev',
        mode: 'focus',
        durationMs: 50 * 60 * 1000,
        completedAt: sevenDaysAgo.getTime(),
        localDate: lastWeekDate,
      },
      // This week: 75 min
      {
        id: 's-curr',
        mode: 'focus',
        durationMs: 75 * 60 * 1000,
        completedAt: now.getTime(),
        localDate: todayDate,
      },
    ];

    render(<WeeklyAnalytics sessionHistory={historyWithPreviousWeek} tasks={[]} />);

    expect(screen.getByTestId('analytics-comparison')).toBeInTheDocument();
    expect(screen.getByText('Comparison with Previous Week')).toBeInTheDocument();
  });

  it('displays informative notice when previous week has no data', () => {
    render(<WeeklyAnalytics sessionHistory={[]} tasks={[]} />);

    expect(screen.getByTestId('analytics-comparison-empty')).toBeInTheDocument();
    expect(screen.getByText(/No activity recorded in the prior week/i)).toBeInTheDocument();
  });

  it('supports selecting a day in the bar chart to inspect its metrics', () => {
    const todayStr = getLocalDateString();
    const history: CompletedSessionRecord[] = [
      {
        id: 's-1',
        mode: 'focus',
        durationMs: 60 * 60 * 1000,
        completedAt: Date.now(),
        localDate: todayStr,
      },
    ];

    render(<WeeklyAnalytics sessionHistory={history} tasks={[]} />);

    const bar = screen.getByTestId(`chart-bar-${todayStr}`);
    fireEvent.click(bar);

    // Inspection banner shows today's details
    const inspectionBanner = screen.getByTestId('chart-inspection-banner');
    expect(inspectionBanner).toHaveTextContent('Focus:');
    expect(inspectionBanner).toHaveTextContent('60m');
  });

  it('allows starting a focus session from the empty state button', () => {
    render(<App />);

    // Go to Analytics
    fireEvent.click(screen.getByTestId('nav-analytics'));
    expect(screen.getByTestId('weekly-analytics-page')).toBeInTheDocument();

    // Click "Start Focus Session" from empty state
    const startFocusBtn = screen.getByTestId('analytics-start-focus-btn');
    fireEvent.click(startFocusBtn);

    // Should navigate back to Timer view
    expect(screen.getByTestId('timer-card')).toBeInTheDocument();
  });
});
