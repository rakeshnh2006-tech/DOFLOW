import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { App } from '../App';
import { TASKS_STORAGE_KEY } from '../utils/taskStorage';
import { PLANNER_STORAGE_KEY } from '../utils/plannerStorage';
import { SESSION_HISTORY_STORAGE_KEY, getLocalDateString } from '../utils/statsStorage';
import { SESSION_REFLECTIONS_STORAGE_KEY } from '../utils/reflectionStorage';
import { PREFERENCES_STORAGE_KEY } from '../utils/settingsStorage';
import type { Task } from '../types/task';
import type { PlannedTask } from '../types/planner';
import type { CompletedSessionRecord } from '../types/stats';
import type { SessionReflection } from '../types/intelligence';

describe('Flow Intelligence Integration and Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const navigateToIntelligenceView = () => {
    const navBtn = screen.getByTestId('nav-intelligence');
    fireEvent.click(navBtn);
  };

  it('renders navigation button and navigates to Flow Intelligence dashboard', () => {
    render(<App />);

    const navBtn = screen.getByTestId('nav-intelligence');
    expect(navBtn).toBeDefined();

    navigateToIntelligenceView();

    expect(screen.getByTestId('flow-intelligence-page')).toBeDefined();
    expect(screen.getByText('Flow Intelligence')).toBeDefined();
    const tagline = screen.getByTestId('intelligence-tagline');
    expect(tagline.textContent).toContain('Turn focus into progress.');
  });

  it('displays transparent Flow Score with breakdown components and toggleable formula drawer', () => {
    const today = getLocalDateString();
    const mockSessions: CompletedSessionRecord[] = [
      { id: 's1', mode: 'focus', durationMs: 25 * 60000, completedAt: Date.now() - 3600000, localDate: today },
      { id: 's2', mode: 'focus', durationMs: 20 * 60000, completedAt: Date.now(), localDate: today },
    ];
    localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(mockSessions));

    render(<App />);
    navigateToIntelligenceView();

    expect(screen.getByTestId('flow-score-card')).toBeDefined();
    const scoreVal = screen.getByTestId('flow-score-value');
    expect(scoreVal).toBeDefined();

    // Verify formula drawer toggle
    const toggleBtn = screen.getByTestId('toggle-score-formula-btn');
    expect(toggleBtn.textContent).toContain('How is this calculated?');

    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('flow-formula-drawer')).toBeDefined();
    expect(screen.getByText('Transparent Formula Breakdown')).toBeDefined();
    expect(screen.getByText(/not a scientific or psychological measurement/i)).toBeDefined();

    // Toggle close
    fireEvent.click(toggleBtn);
    expect(screen.queryByTestId('flow-formula-drawer')).toBeNull();
  });

  it('ranks and recommends next task, allows focusing task and navigates to timer', () => {
    const mockTasks: Task[] = [
      { id: 'task-1', title: 'Write unit tests', completed: false, createdAt: 1 },
      { id: 'task-2', title: 'Refactor engine', completed: false, createdAt: 2 },
    ];
    const today = getLocalDateString();
    const mockPlanned: PlannedTask[] = [
      { id: 'task-1', title: 'Write unit tests', completed: false, priority: 'high', isTodayPriority: true, date: today, createdAt: 1 },
      { id: 'task-2', title: 'Refactor engine', completed: false, priority: 'low', isTodayPriority: false, date: today, createdAt: 2 },
    ];

    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(mockTasks));
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(mockPlanned));

    render(<App />);
    navigateToIntelligenceView();

    const taskCard = screen.getByTestId('task-recommendation-card');
    expect(taskCard).toBeDefined();

    // Top recommendation should be task-1
    const recTitle = screen.getByTestId('recommended-task-title');
    expect(recTitle.textContent).toContain('Write unit tests');
    expect(screen.getByTestId('recommended-task-top-flag')).toBeDefined();
    expect(screen.getByTestId('recommended-task-reason').textContent).toContain("Marked as Today's Top Priority");

    // Clicking "Focus on this Task" should set active task and return to timer
    const focusBtn = screen.getByTestId('focus-recommended-btn');
    fireEvent.click(focusBtn);

    // Should now be on timer page
    expect(screen.getByTestId('countdown-display')).toBeDefined();
    const goalBanner = screen.getByTestId('current-focus-goal');
    expect(within(goalBanner).getByText('Write unit tests')).toBeDefined();
  });

  it('allows dismissing a recommendation to reveal next ranked task', () => {
    const mockTasks: Task[] = [
      { id: 'task-1', title: 'Alpha Task', completed: false, createdAt: 1 },
      { id: 'task-2', title: 'Beta Task', completed: false, createdAt: 2 },
    ];
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(mockTasks));

    render(<App />);
    navigateToIntelligenceView();

    expect(screen.getByTestId('recommended-task-title').textContent).toContain('Alpha Task');

    const dismissBtn = screen.getByTestId('dismiss-recommendation-btn');
    fireEvent.click(dismissBtn);

    // Next task should now be displayed
    expect(screen.getByTestId('recommended-task-title').textContent).toContain('Beta Task');
  });

  it('allows manual task selection via dropdown and navigates to timer with chosen task', () => {
    const mockTasks: Task[] = [
      { id: 'task-1', title: 'Alpha Task', completed: false, createdAt: 1 },
      { id: 'task-2', title: 'Beta Task', completed: false, createdAt: 2 },
    ];
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(mockTasks));

    render(<App />);
    navigateToIntelligenceView();

    const select = screen.getByTestId('manual-task-select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'task-2' } });

    // Selecting manually sets active task and navigates to timer
    expect(screen.getByTestId('countdown-display')).toBeDefined();
    const goalBanner = screen.getByTestId('current-focus-goal');
    expect(within(goalBanner).getByText('Beta Task')).toBeDefined();
  });

  it('displays empty state when all tasks are completed', () => {
    const mockTasks: Task[] = [
      { id: 'task-done', title: 'Finished Task', completed: true, createdAt: 1 },
    ];
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(mockTasks));

    render(<App />);
    navigateToIntelligenceView();

    expect(screen.getByTestId('no-recommendations-empty')).toBeDefined();
    expect(screen.getByText('All tasks completed!')).toBeDefined();
  });

  it('displays personal productivity insights with insufficient data labels when empty', () => {
    render(<App />);
    navigateToIntelligenceView();

    const insightsCard = screen.getByTestId('personal-insights-card');
    expect(insightsCard).toBeDefined();

    expect(screen.getByTestId('evidence-badge-peak').textContent).toContain('Needs 3 Focus Sessions');
    expect(screen.getByTestId('evidence-badge-duration').textContent).toContain('Needs 2 Sessions');
    expect(screen.getByTestId('evidence-badge-quality').textContent).toContain('Needs 3 Reflections');
  });

  it('displays personal productivity insights when sufficient data exists', () => {
    const morningTimestamp = new Date('2026-10-20T09:00:00').getTime();
    const mockSessions: CompletedSessionRecord[] = [
      { id: 's1', mode: 'focus', durationMs: 25 * 60000, completedAt: morningTimestamp, localDate: '2026-10-20' },
      { id: 's2', mode: 'focus', durationMs: 25 * 60000, completedAt: morningTimestamp + 3600000, localDate: '2026-10-20' },
      { id: 's3', mode: 'focus', durationMs: 30 * 60000, completedAt: morningTimestamp + 7200000, localDate: '2026-10-20' },
    ];
    const mockReflections: SessionReflection[] = [
      { sessionId: 's1', completedAt: morningTimestamp, localDate: '2026-10-20', quality: 'productive' },
      { sessionId: 's2', completedAt: morningTimestamp + 3600000, localDate: '2026-10-20', quality: 'productive' },
      { sessionId: 's3', completedAt: morningTimestamp + 7200000, localDate: '2026-10-20', quality: 'productive' },
      { sessionId: 's4', completedAt: morningTimestamp + 10800000, localDate: '2026-10-20', quality: 'distracted' },
    ];

    localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(mockSessions));
    localStorage.setItem(SESSION_REFLECTIONS_STORAGE_KEY, JSON.stringify(mockReflections));

    render(<App />);
    navigateToIntelligenceView();

    const peakSummary = screen.getByTestId('peak-time-summary');
    expect(peakSummary.textContent).toContain('Morning');

    const durationVal = screen.getByTestId('avg-duration-value');
    expect(durationVal.textContent).toBe('27');

    const qualitySummary = screen.getByTestId('session-quality-summary');
    expect(qualitySummary.textContent).toContain('75%'); // 3/4 productive
  });

  it('renders adaptive suggestions and allows applying them safely to user preferences', () => {
    // 3 sessions with high distractions (>40%) to trigger a 20-minute adaptive suggestion
    const mockSessions: CompletedSessionRecord[] = [
      { id: 's1', mode: 'focus', durationMs: 25 * 60000, completedAt: 1000, localDate: '2026-10-20' },
      { id: 's2', mode: 'focus', durationMs: 25 * 60000, completedAt: 2000, localDate: '2026-10-20' },
      { id: 's3', mode: 'focus', durationMs: 25 * 60000, completedAt: 3000, localDate: '2026-10-20' },
    ];
    const mockReflections: SessionReflection[] = [
      { sessionId: 's1', completedAt: 1000, localDate: '2026-10-20', quality: 'distracted' },
      { sessionId: 's2', completedAt: 2000, localDate: '2026-10-20', quality: 'distracted' },
      { sessionId: 's3', completedAt: 3000, localDate: '2026-10-20', quality: 'productive' },
    ];

    localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(mockSessions));
    localStorage.setItem(SESSION_REFLECTIONS_STORAGE_KEY, JSON.stringify(mockReflections));

    render(<App />);
    navigateToIntelligenceView();

    const suggestionsCard = screen.getByTestId('adaptive-suggestions-card');
    expect(suggestionsCard).toBeDefined();

    expect(screen.getByTestId('suggested-focus-mins').textContent).toBe('20');

    const applyBtn = screen.getByTestId('apply-suggestions-btn');
    expect(applyBtn).toBeDefined();
    fireEvent.click(applyBtn);

    // Preferences in storage should now be updated to 20m focus
    const savedPrefs = JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) || '{}');
    expect(savedPrefs.focusDurationMinutes).toBe(20);
  });

  it('renders reflections log section with empty state when no reflections exist', () => {
    render(<App />);
    navigateToIntelligenceView();

    expect(screen.getByTestId('reflections-log-section')).toBeDefined();
    expect(screen.getByTestId('reflections-empty-state')).toBeDefined();
    expect(screen.getByText('No session reflections today yet')).toBeDefined();
  });
});
