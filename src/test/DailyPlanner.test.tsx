import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App';
import { TASKS_STORAGE_KEY } from '../utils/taskStorage';
import { PLANNER_STORAGE_KEY } from '../utils/plannerStorage';
import { getLocalDateString } from '../utils/statsStorage';

describe('Feature 6: Daily Planner Integration Tests', () => {
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

  // 1. Navigation & Header
  it('navigates between Timer and Daily Planner views using header navigation', () => {
    render(<App />);

    // Initially on Timer view
    expect(screen.getByTestId('timer-card')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-planner-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('nav-timer')).toHaveClass('active');
    expect(screen.getByTestId('nav-planner')).not.toHaveClass('active');

    // Click Daily Planner tab in header
    fireEvent.click(screen.getByTestId('nav-planner'));

    // Daily Planner is rendered
    expect(screen.getByTestId('daily-planner-page')).toBeInTheDocument();
    expect(screen.getByTestId('nav-planner')).toHaveClass('active');
    expect(screen.getByTestId('nav-timer')).not.toHaveClass('active');

    // Timer card remains in DOM (hidden) so running timer continues
    expect(screen.getByTestId('timer-card')).toBeInTheDocument();

    // Click Timer tab in header
    fireEvent.click(screen.getByTestId('nav-timer'));
    expect(screen.queryByTestId('daily-planner-page')).not.toBeInTheDocument();
    expect(screen.getByTestId('nav-timer')).toHaveClass('active');
  });

  it('displays today\'s date formatted in user\'s local timezone', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('nav-planner'));

    const dateElem = screen.getByTestId('planner-local-date');
    expect(dateElem).toBeInTheDocument();
    // Non-empty formatted string
    expect(dateElem.textContent?.length).toBeGreaterThan(5);
  });

  // 2. Creating New Planned Tasks & Validation
  it('validates planned task inputs and creates new planned task', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('nav-planner'));

    // Try submitting empty task
    fireEvent.click(screen.getByTestId('add-planned-task-button'));
    expect(screen.getByTestId('planner-error-message')).toHaveTextContent('Please enter a task title.');

    // Try submitting with deadline earlier than start time
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Write API Documentation' },
    });
    fireEvent.change(screen.getByTestId('planner-start-time-input'), {
      target: { value: '14:00' },
    });
    fireEvent.change(screen.getByTestId('planner-deadline-input'), {
      target: { value: '10:00' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));
    expect(screen.getByTestId('planner-error-message')).toHaveTextContent(
      'Deadline cannot be earlier than planned start time.'
    );

    // Fix deadline and set Priority to High and Today's Top Priority
    fireEvent.change(screen.getByTestId('planner-deadline-input'), {
      target: { value: '16:00' },
    });
    fireEvent.click(screen.getByTestId('planner-priority-high'));
    fireEvent.click(screen.getByTestId('planner-today-priority-checkbox'));
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    // Form resets and error clears
    expect(screen.queryByTestId('planner-error-message')).not.toBeInTheDocument();
    expect(screen.getByTestId('planner-task-title-input')).toHaveValue('');

    // Summary counts updated: 1 total, 0 completed, 1 remaining
    expect(screen.getByTestId('planner-total-count')).toHaveTextContent('1');
    expect(screen.getByTestId('planner-completed-count')).toHaveTextContent('0');
    expect(screen.getByTestId('planner-remaining-count')).toHaveTextContent('1');

    // Task is displayed in list with High priority and Today's Priority banner
    const taskCards = screen.getAllByRole('listitem');
    expect(taskCards.length).toBe(1);
    expect(taskCards[0]).toHaveTextContent('Write API Documentation');
    expect(taskCards[0]).toHaveTextContent('HIGH');
    expect(taskCards[0]).toHaveTextContent("Today’s Top Priority");
    expect(taskCards[0]).toHaveTextContent('14:00 – 16:00');
  });

  // 3. Picking from Existing Doflow Tasks
  it('allows selecting an existing Doflow task without creating duplicates and prevents duplicate scheduling', () => {
    // Pre-populate an existing task in Doflow tasks storage
    window.localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'existing-task-1',
          title: 'Review System Metrics',
          completed: false,
          createdAt: 1000,
        },
      ])
    );

    render(<App />);
    fireEvent.click(screen.getByTestId('nav-planner'));

    // Switch to "Pick from Doflow Tasks" tab
    fireEvent.click(screen.getByTestId('planner-tab-existing-task'));

    // Select existing task
    const selectElem = screen.getByTestId('planner-select-existing-task');
    fireEvent.change(selectElem, { target: { value: 'existing-task-1' } });

    // Set planned start time
    fireEvent.change(screen.getByTestId('planner-start-time-input'), {
      target: { value: '11:00' },
    });
    fireEvent.click(screen.getByTestId('planner-priority-medium'));
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    expect(screen.queryByTestId('planner-error-message')).not.toBeInTheDocument();

    const taskCard = screen.getByTestId('planned-task-card-existing-task-1');
    expect(taskCard).toBeInTheDocument();
    expect(taskCard).toHaveTextContent('Review System Metrics');

    // Verify task is now removed from unplanned tasks dropdown
    expect(screen.getByTestId('planner-tab-existing-task')).toHaveTextContent('(0)');
  });

  // 4. Chronological Sorting & Unscheduled Handling
  it('displays tasks in chronological order by start time, and handles unscheduled tasks cleanly', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('nav-planner'));

    // Add Task 1: 15:00
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Afternoon Workshop' },
    });
    fireEvent.change(screen.getByTestId('planner-start-time-input'), {
      target: { value: '15:00' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    // Add Task 2: 09:00
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Morning Standup' },
    });
    fireEvent.change(screen.getByTestId('planner-start-time-input'), {
      target: { value: '09:00' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    // Add Task 3: Unscheduled
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Read Technical Article' },
    });
    fireEvent.change(screen.getByTestId('planner-start-time-input'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    // Add Task 4: 11:30
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Midday Architecture Sync' },
    });
    fireEvent.change(screen.getByTestId('planner-start-time-input'), {
      target: { value: '11:30' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    // Check order of rendered tasks: 09:00 -> 11:30 -> 15:00 -> Unscheduled
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Morning Standup'); // 09:00
    expect(items[1]).toHaveTextContent('Midday Architecture Sync'); // 11:30
    expect(items[2]).toHaveTextContent('Afternoon Workshop'); // 15:00
    expect(items[3]).toHaveTextContent('Read Technical Article'); // Unscheduled
    expect(items[3]).toHaveTextContent('Unscheduled');
  });

  // 5. Overdue and Upcoming Detection
  it('distinguishes overdue and upcoming tasks based on current local time', () => {
    // Set mock time to 14:00 (2:00 PM)
    vi.setSystemTime(new Date(2026, 9, 20, 14, 0, 0));

    render(<App />);
    fireEvent.click(screen.getByTestId('nav-planner'));

    // Add Past Task (Deadline 12:00 -> Overdue at 14:00)
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Morning Code Review' },
    });
    fireEvent.change(screen.getByTestId('planner-start-time-input'), {
      target: { value: '10:00' },
    });
    fireEvent.change(screen.getByTestId('planner-deadline-input'), {
      target: { value: '12:00' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    // Add Future Task (Starts 16:00 -> Upcoming at 14:00)
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Late Afternoon Meeting' },
    });
    fireEvent.change(screen.getByTestId('planner-start-time-input'), {
      target: { value: '16:00' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    // Verify overdue badge appears on Morning Code Review
    const cards = screen.getAllByRole('listitem');
    expect(cards[0]).toHaveTextContent('Morning Code Review');
    expect(cards[0]).toHaveTextContent(/Overdue/i);

    // Verify upcoming badge appears on Late Afternoon Meeting
    expect(cards[1]).toHaveTextContent('Late Afternoon Meeting');
    expect(cards[1]).toHaveTextContent(/Upcoming/i);
  });

  // 6. Filtering (All, Planned, In Progress, Completed)
  it('filters tasks accurately by All, Planned, In Progress, and Completed', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('nav-planner'));

    // Add Task 1 (Planned)
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Planned Task Alpha' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    // Add Task 2 (Will be marked Completed)
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Completed Task Beta' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    // Add Task 3 (Will be marked Focus Goal / In Progress)
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Focus Goal Gamma' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);

    // Find checkboxes & buttons
    const plannedTasks = JSON.parse(window.localStorage.getItem(PLANNER_STORAGE_KEY) || '[]');
    const betaId = plannedTasks.find((t: { title: string }) => t.title === 'Completed Task Beta').id;
    const gammaId = plannedTasks.find((t: { title: string }) => t.title === 'Focus Goal Gamma').id;

    // Mark Beta complete
    fireEvent.click(screen.getByTestId(`planner-task-checkbox-${betaId}`));

    // Set Gamma as active focus goal
    fireEvent.click(screen.getByTestId(`set-focus-goal-button-${gammaId}`));

    // Filter: Planned -> only Alpha
    fireEvent.click(screen.getByTestId('planner-filter-planned'));
    const plannedList = screen.getByTestId('planned-tasks-list');
    expect(within(plannedList).getAllByRole('listitem')).toHaveLength(1);
    expect(within(plannedList).getByText('Planned Task Alpha')).toBeInTheDocument();

    // Filter: In Progress -> only Gamma
    fireEvent.click(screen.getByTestId('planner-filter-in-progress'));
    const inProgressList = screen.getByTestId('planned-tasks-list');
    expect(within(inProgressList).getAllByRole('listitem')).toHaveLength(1);
    expect(within(inProgressList).getByText('Focus Goal Gamma')).toBeInTheDocument();

    // Filter: Completed -> only Beta
    fireEvent.click(screen.getByTestId('planner-filter-completed'));
    const completedList = screen.getByTestId('planned-tasks-list');
    expect(within(completedList).getAllByRole('listitem')).toHaveLength(1);
    expect(within(completedList).getByText('Completed Task Beta')).toBeInTheDocument();

    // Filter: All -> all 3
    fireEvent.click(screen.getByTestId('planner-filter-all'));
    expect(within(screen.getByTestId('planned-tasks-list')).getAllByRole('listitem')).toHaveLength(3);
  });

  // 7. Editing & Deleting Planned Tasks
  it('allows editing and deleting planned tasks', () => {
    render(<App />);
    fireEvent.click(screen.getByTestId('nav-planner'));

    // Create task
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Original Task Title' },
    });
    fireEvent.change(screen.getByTestId('planner-start-time-input'), {
      target: { value: '10:00' },
    });
    fireEvent.click(screen.getByTestId('planner-priority-low'));
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    const plannedTasks = JSON.parse(window.localStorage.getItem(PLANNER_STORAGE_KEY) || '[]');
    const taskId = plannedTasks[0].id;

    // Click Edit button
    fireEvent.click(screen.getByTestId(`edit-planned-task-button-${taskId}`));
    expect(screen.getByTestId('edit-planned-task-modal')).toBeInTheDocument();

    // Update title to 'Updated Task Title', priority to High, start to 11:00
    fireEvent.change(screen.getByTestId('edit-task-title-input'), {
      target: { value: 'Updated Task Title' },
    });
    fireEvent.change(screen.getByTestId('edit-start-time-input'), {
      target: { value: '11:00' },
    });
    fireEvent.click(screen.getByTestId('edit-priority-high'));
    fireEvent.click(screen.getByTestId('save-edit-task-button'));

    // Modal closes
    expect(screen.queryByTestId('edit-planned-task-modal')).not.toBeInTheDocument();

    // Task updated in UI
    expect(screen.getByTestId(`planner-task-title-${taskId}`)).toHaveTextContent('Updated Task Title');
    expect(screen.getByTestId(`planner-priority-badge-${taskId}`)).toHaveTextContent('HIGH');

    // Delete task
    fireEvent.click(screen.getByTestId(`delete-planned-task-button-${taskId}`));
    expect(screen.queryByTestId(`planner-task-card-${taskId}`)).not.toBeInTheDocument();
    expect(screen.getByTestId('planner-empty-state')).toBeInTheDocument();
  });

  // 8. Synchronization with Task System & Statistics
  it('keeps completion synchronized between Daily Planner and Task Manager without double-counting stats', () => {
    render(<App />);

    // 1. In Planner, create a task
    fireEvent.click(screen.getByTestId('nav-planner'));
    fireEvent.change(screen.getByTestId('planner-task-title-input'), {
      target: { value: 'Unified Synchronized Task' },
    });
    fireEvent.click(screen.getByTestId('add-planned-task-button'));

    const plannedTasks = JSON.parse(window.localStorage.getItem(PLANNER_STORAGE_KEY) || '[]');
    const taskId = plannedTasks[0].id;

    // 2. Switch to Timer view -> Task Manager has the task!
    fireEvent.click(screen.getByTestId('nav-timer'));
    expect(screen.getByTestId(`task-title-${taskId}`)).toHaveTextContent('Unified Synchronized Task');

    // Daily Stats: completed tasks is 0
    expect(screen.getByTestId('stat-completed-tasks-value')).toHaveTextContent('0');

    // 3. Mark completed in Timer view Task Manager
    fireEvent.click(screen.getByTestId(`task-checkbox-${taskId}`));
    expect(screen.getByTestId('stat-completed-tasks-value')).toHaveTextContent('1');

    // 4. Switch back to Daily Planner -> task is marked complete there as well!
    fireEvent.click(screen.getByTestId('nav-planner'));
    expect(screen.getByTestId(`planner-task-checkbox-${taskId}`)).toHaveClass('checked');
    expect(screen.getByTestId('planner-completed-count')).toHaveTextContent('1');

    // 5. Uncheck in Daily Planner
    fireEvent.click(screen.getByTestId(`planner-task-checkbox-${taskId}`));
    expect(screen.getByTestId('planner-completed-count')).toHaveTextContent('0');

    // 6. Switch to Timer view -> Task Manager is updated and stats reflects 0
    fireEvent.click(screen.getByTestId('nav-timer'));
    expect(screen.getByTestId('stat-completed-tasks-value')).toHaveTextContent('0');
  });

  // 9. Full Offline Persistence & Refresh Recovery
  it('restores planned tasks from localStorage on page refresh', () => {
    // Populate storage with planned tasks
    window.localStorage.setItem(
      TASKS_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'persisted-task-1',
          title: 'Persisted Architecture Review',
          completed: false,
          createdAt: 1000,
        },
      ])
    );
    window.localStorage.setItem(
      PLANNER_STORAGE_KEY,
      JSON.stringify([
        {
          id: 'persisted-task-1',
          title: 'Persisted Architecture Review',
          completed: false,
          createdAt: 1000,
          date: getLocalDateString(),
          startTime: '10:00',
          deadline: '12:00',
          priority: 'high',
          isTodayPriority: true,
        },
      ])
    );

    render(<App />);
    fireEvent.click(screen.getByTestId('nav-planner'));

    // Verified loaded from storage
    expect(screen.getByTestId('planned-task-card-persisted-task-1')).toBeInTheDocument();
    expect(screen.getByTestId('planner-task-title-persisted-task-1')).toHaveTextContent('Persisted Architecture Review');
    expect(screen.getByTestId('planner-priority-badge-persisted-task-1')).toHaveTextContent('HIGH');
    expect(screen.getByTestId('planner-top-priority-badge-persisted-task-1')).toBeInTheDocument();
  });
});
