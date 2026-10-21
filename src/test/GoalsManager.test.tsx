import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { App } from '../App';
import {
  DAILY_GOALS_STORAGE_KEY,
  ACHIEVEMENTS_STORAGE_KEY,
} from '../utils/goalsStorage';
import { TASKS_STORAGE_KEY } from '../utils/taskStorage';
import { SESSION_HISTORY_STORAGE_KEY } from '../utils/statsStorage';
import type { CompletedSessionRecord } from '../types/stats';
import type { Task } from '../types/task';
import type { DailyGoalsConfig } from '../types/goals';

describe('GoalsManager and Feature 10 Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const navigateToGoalsView = () => {
    const goalsNavBtn = screen.getByTestId('nav-goals');
    fireEvent.click(goalsNavBtn);
  };

  it('renders navigation button and switches to Goals & Achievements view', () => {
    render(<App />);

    const goalsNavBtn = screen.getByTestId('nav-goals');
    expect(goalsNavBtn).toBeDefined();

    navigateToGoalsView();

    expect(screen.getByTestId('goals-manager-page')).toBeDefined();
    expect(screen.getByText('Goals & Achievements')).toBeDefined();
    expect(screen.getByTestId('edit-goals-btn')).toBeDefined();
  });

  it('renders daily goal cards with accurate default progress indicators', () => {
    render(<App />);
    navigateToGoalsView();

    expect(screen.getByTestId('daily-goals-grid')).toBeDefined();

    // 1. Focus Minutes Card
    const minutesCard = screen.getByTestId('goal-card-minutes');
    expect(within(minutesCard).getByText('Daily Focus Time')).toBeDefined();
    expect(within(minutesCard).getByText('0')).toBeDefined();
    expect(within(minutesCard).getByText('/ 60 min')).toBeDefined();
    expect(within(minutesCard).getByText('60 min to go')).toBeDefined();

    // 2. Focus Sessions Card
    const sessionsCard = screen.getByTestId('goal-card-sessions');
    expect(within(sessionsCard).getByText('Focus Sessions')).toBeDefined();
    expect(within(sessionsCard).getByText('/ 4 sessions')).toBeDefined();
    expect(within(sessionsCard).getByText('4 sessions to go')).toBeDefined();

    // 3. Completed Tasks Card
    const tasksCard = screen.getByTestId('goal-card-tasks');
    expect(within(tasksCard).getByText('Completed Tasks')).toBeDefined();
    expect(within(tasksCard).getByText('/ 3 tasks')).toBeDefined();
    expect(within(tasksCard).getByText('3 tasks to go')).toBeDefined();
  });

  it('allows user to configure daily goals via modal and validates inputs', () => {
    render(<App />);
    navigateToGoalsView();

    // Open Edit Goals modal
    fireEvent.click(screen.getByTestId('edit-goals-btn'));
    expect(screen.getByTestId('goals-modal')).toBeDefined();
    expect(screen.getByText('Configure Daily Goals')).toBeDefined();

    // Test validation: input 0 minutes (invalid)
    const minutesInput = screen.getByTestId('goal-minutes-input');
    fireEvent.change(minutesInput, { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('goals-modal-save-btn'));

    expect(screen.getByTestId('goals-validation-error')).toBeDefined();
    expect(
      screen.getByText('Focus minutes target must be a whole number between 1 and 720.')
    ).toBeDefined();

    // Set valid inputs: 90 minutes, 5 sessions, 4 tasks
    fireEvent.change(minutesInput, { target: { value: '90' } });

    const sessionsInput = screen.getByTestId('goal-sessions-input');
    fireEvent.change(sessionsInput, { target: { value: '5' } });

    const tasksInput = screen.getByTestId('goal-tasks-input');
    fireEvent.change(tasksInput, { target: { value: '4' } });

    // Save
    fireEvent.click(screen.getByTestId('goals-modal-save-btn'));

    // Modal closes
    expect(screen.queryByTestId('goals-modal')).toBeNull();

    // Check updated targets in cards
    const minutesCard = screen.getByTestId('goal-card-minutes');
    expect(within(minutesCard).getByText('/ 90 min')).toBeDefined();
    expect(within(minutesCard).getByText('90 min to go')).toBeDefined();

    const sessionsCard = screen.getByTestId('goal-card-sessions');
    expect(within(sessionsCard).getByText('/ 5 sessions')).toBeDefined();
    expect(within(sessionsCard).getByText('5 sessions to go')).toBeDefined();
  });

  it('supports disabling and re-enabling optional daily task goal', () => {
    render(<App />);
    navigateToGoalsView();

    // Open modal
    fireEvent.click(screen.getByTestId('edit-goals-btn'));

    // Uncheck daily tasks toggle
    const toggle = screen.getByTestId('goal-tasks-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    fireEvent.click(toggle);
    expect(toggle.checked).toBe(false);

    // Save
    fireEvent.click(screen.getByTestId('goals-modal-save-btn'));

    // Tasks card displays disabled optional state
    const tasksCard = screen.getByTestId('goal-card-tasks');
    expect(within(tasksCard).getByText('Optional (Off)')).toBeDefined();
    expect(screen.getByTestId('enable-goal-tasks-btn')).toBeDefined();

    // Clicking enable button opens modal again
    fireEvent.click(screen.getByTestId('enable-goal-tasks-btn'));
    expect(screen.getByTestId('goals-modal')).toBeDefined();
  });

  it('renders milestones with accurate unlock states and filters between All, Earned, and Locked', () => {
    // Seed one completed task in localStorage so 1 milestone is unlocked
    const tasks: Task[] = [
      {
        id: 't-1',
        title: 'Review pull request',
        completed: true,
        createdAt: 1729400000000,
        completedAt: 1729405000000,
      },
    ];
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));

    render(<App />);
    navigateToGoalsView();

    // Unlocked counter displays 1 / 9 Unlocked
    expect(screen.getByTestId('milestones-count-pill')).toBeDefined();
    expect(screen.getByText('1 / 9 Unlocked')).toBeDefined();

    // "Task Finisher" milestone is unlocked
    expect(screen.getByTestId('achievement-unlocked-first_task_completed')).toBeDefined();

    // "First Step" focus milestone is still locked
    expect(screen.getByTestId('achievement-progress-first_focus_session')).toBeDefined();

    // Switch to "Earned" filter
    fireEvent.click(screen.getByTestId('achievement-filter-unlocked'));
    expect(screen.getByTestId('achievement-card-first_task_completed')).toBeDefined();
    expect(screen.queryByTestId('achievement-card-first_focus_session')).toBeNull();

    // Switch to "Locked" filter
    fireEvent.click(screen.getByTestId('achievement-filter-locked'));
    expect(screen.queryByTestId('achievement-card-first_task_completed')).toBeNull();
    expect(screen.getByTestId('achievement-card-first_focus_session')).toBeDefined();

    // Switch back to "All" filter
    fireEvent.click(screen.getByTestId('achievement-filter-all'));
    expect(screen.getByTestId('achievement-card-first_task_completed')).toBeDefined();
    expect(screen.getByTestId('achievement-card-first_focus_session')).toBeDefined();
  });

  it('shows empty state when Earned filter has 0 unlocked milestones', () => {
    render(<App />);
    navigateToGoalsView();

    // Brand new user has 0 unlocked milestones
    fireEvent.click(screen.getByTestId('achievement-filter-unlocked'));
    expect(screen.getByTestId('achievements-empty-state')).toBeDefined();
    expect(screen.getByText('No milestones earned yet')).toBeDefined();
  });

  it('restores custom daily goals and unlocked milestones from localStorage on refresh', () => {
    const savedGoals: DailyGoalsConfig = {
      targetFocusMinutes: 120,
      targetFocusSessions: 8,
      tasksGoalEnabled: true,
      targetCompletedTasks: 6,
    };

    const savedAchievements = [
      { id: 'first_focus_session', unlockedAt: 1729410000000 },
      { id: 'first_task_completed', unlockedAt: 1729415000000 },
    ];

    localStorage.setItem(DAILY_GOALS_STORAGE_KEY, JSON.stringify(savedGoals));
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(savedAchievements));

    render(<App />);
    navigateToGoalsView();

    // Restores custom targets
    const minutesCard = screen.getByTestId('goal-card-minutes');
    expect(within(minutesCard).getByText('/ 120 min')).toBeDefined();

    const sessionsCard = screen.getByTestId('goal-card-sessions');
    expect(within(sessionsCard).getByText('/ 8 sessions')).toBeDefined();

    // Restores 2 unlocked achievements
    expect(screen.getByText('2 / 9 Unlocked')).toBeDefined();
    expect(screen.getByTestId('achievement-unlocked-first_focus_session')).toBeDefined();
    expect(screen.getByTestId('achievement-unlocked-first_task_completed')).toBeDefined();
  });

  it('shows Goal Reached badge when current progress equals or exceeds target', () => {
    // 3 focus sessions of 25 min = 75 minutes on today's local date
    const todayStr = new Date().toLocaleDateString('en-CA');
    const sessions: CompletedSessionRecord[] = [1, 2, 3].map((i) => ({
      id: `session-${i}`,
      mode: 'focus',
      durationMs: 25 * 60 * 1000,
      completedAt: Date.now() - i * 1000,
      localDate: todayStr,
    }));

    // Target is 60 minutes and 3 sessions
    const goals: DailyGoalsConfig = {
      targetFocusMinutes: 60,
      targetFocusSessions: 3,
      tasksGoalEnabled: false,
      targetCompletedTasks: 3,
    };

    localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(sessions));
    localStorage.setItem(DAILY_GOALS_STORAGE_KEY, JSON.stringify(goals));

    render(<App />);
    navigateToGoalsView();

    // Focus minutes: 75 / 60 -> Goal Reached!
    expect(screen.getByTestId('goal-completed-badge-minutes')).toBeDefined();

    // Focus sessions: 3 / 3 -> Goal Reached!
    expect(screen.getByTestId('goal-completed-badge-sessions')).toBeDefined();

    // Target Achieved milestone unlocked
    expect(screen.getByTestId('achievement-unlocked-daily_focus_target_reached')).toBeDefined();
  });
});
