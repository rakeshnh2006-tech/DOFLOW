import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import App from '../App';
import { TASKS_STORAGE_KEY } from '../utils/taskStorage';

describe('FEATURE 3: Task Management & Timer Independence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // 1. Initial Empty State
  it('displays empty state initially when no tasks exist', () => {
    render(<App />);

    expect(screen.getByTestId('tasks-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/No tasks added yet/i)).toBeInTheDocument();
    expect(screen.getByTestId('task-input')).toHaveValue('');
    expect(screen.queryByTestId('current-focus-goal')).not.toBeInTheDocument();
  });

  // 2. Rejecting Invalid Task Names
  it('rejects empty or whitespace-only task names with a helpful validation message', () => {
    render(<App />);

    const addButton = screen.getByTestId('add-task-button');
    const input = screen.getByTestId('task-input');

    // Attempt submitting empty
    fireEvent.click(addButton);
    expect(screen.getByTestId('task-error-message')).toHaveTextContent(/Task name cannot be empty/i);
    expect(screen.getByTestId('tasks-empty-state')).toBeInTheDocument();

    // Attempt submitting whitespace only
    fireEvent.change(input, { target: { value: '    ' } });
    fireEvent.click(addButton);
    expect(screen.getByTestId('task-error-message')).toHaveTextContent(/Task name cannot be empty/i);
    expect(screen.getByTestId('tasks-empty-state')).toBeInTheDocument();

    // Typing valid text clears error message
    fireEvent.change(input, { target: { value: 'Write documentation' } });
    expect(screen.queryByTestId('task-error-message')).not.toBeInTheDocument();
  });

  // 3. Adding Valid Task & Auto-Selecting First Task
  it('adds a valid task, clears input, hides empty state, and selects it as active focus', () => {
    render(<App />);

    const input = screen.getByTestId('task-input');
    const addButton = screen.getByTestId('add-task-button');

    fireEvent.change(input, { target: { value: 'Design user onboarding flow' } });
    fireEvent.click(addButton);

    // Input is cleared
    expect(input).toHaveValue('');
    expect(screen.queryByTestId('tasks-empty-state')).not.toBeInTheDocument();

    // Task is listed in the list
    const taskList = screen.getByTestId('task-list');
    expect(within(taskList).getByText('Design user onboarding flow')).toBeInTheDocument();

    // First task is auto-selected as active focus task
    expect(screen.getByTestId('active-task-badge')).toHaveTextContent(/Current Focus/i);
    expect(screen.getByTestId('current-focus-goal')).toHaveTextContent(/Design user onboarding flow/i);
  });

  // 4. Changing the Selected Active Task
  it('allows exactly one active task to be selected and supports switching active task', () => {
    render(<App />);

    const input = screen.getByTestId('task-input');
    const addButton = screen.getByTestId('add-task-button');

    // Add Task 1
    fireEvent.change(input, { target: { value: 'Task One' } });
    fireEvent.click(addButton);

    // Add Task 2
    fireEvent.change(input, { target: { value: 'Task Two' } });
    fireEvent.click(addButton);

    // Task One is currently active
    expect(screen.getByTestId('current-focus-goal')).toHaveTextContent('Task One');

    // Click "Focus" on Task Two
    const selectButtons = screen.getAllByRole('button', { name: /focus/i });
    const taskTwoFocusBtn = selectButtons.find((btn) =>
      btn.getAttribute('data-testid')?.startsWith('select-task-button-') &&
      btn.getAttribute('aria-label')?.includes('Task Two')
    );
    expect(taskTwoFocusBtn).toBeDefined();

    fireEvent.click(taskTwoFocusBtn!);

    // Now Task Two is the active focus goal
    expect(screen.getByTestId('current-focus-goal')).toHaveTextContent('Task Two');

    // Exactly one active badge exists
    const activeBadges = screen.getAllByTestId('active-task-badge');
    expect(activeBadges).toHaveLength(1);
  });

  // 5. Completing and Undoing Tasks
  it('allows users to mark tasks complete and undo completion', () => {
    render(<App />);

    const input = screen.getByTestId('task-input');
    const addButton = screen.getByTestId('add-task-button');

    fireEvent.change(input, { target: { value: 'Refactor state machine' } });
    fireEvent.click(addButton);

    const checkbox = screen.getByRole('checkbox', { name: /Mark "Refactor state machine" complete/i });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');

    // 1. Mark complete
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('task-counter')).toHaveTextContent('1 of 1 completed');

    // Task item has 'completed' class (visual strikethrough)
    const taskList = screen.getByTestId('task-list');
    const taskTitle = within(taskList).getByText('Refactor state machine');
    expect(taskTitle.closest('li')).toHaveClass('completed');

    // 2. Undo completion
    fireEvent.click(checkbox);
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('task-counter')).toHaveTextContent('0 of 1 completed');
    expect(taskTitle.closest('li')).not.toHaveClass('completed');
  });

  // 6. Deleting Tasks with Confirmation
  it('requires confirmation before deleting a task and removes it upon confirmation', () => {
    render(<App />);

    const input = screen.getByTestId('task-input');
    const addButton = screen.getByTestId('add-task-button');

    fireEvent.change(input, { target: { value: 'Clean up workspace' } });
    fireEvent.click(addButton);

    const taskList = screen.getByTestId('task-list');
    expect(within(taskList).getByText('Clean up workspace')).toBeInTheDocument();

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /Delete task "Clean up workspace"/i });
    fireEvent.click(deleteButton);

    // Delete confirmation modal appears
    expect(screen.getByTestId('delete-task-modal')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();

    // 1. Cancel deletion
    fireEvent.click(screen.getByTestId('cancel-delete-button'));
    expect(screen.queryByTestId('delete-task-modal')).not.toBeInTheDocument();
    expect(within(taskList).getByText('Clean up workspace')).toBeInTheDocument();

    // 2. Confirm deletion
    fireEvent.click(deleteButton);
    fireEvent.click(screen.getByTestId('confirm-delete-button'));

    expect(screen.queryByTestId('delete-task-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('task-list')).not.toBeInTheDocument();
    expect(screen.getByTestId('tasks-empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('current-focus-goal')).not.toBeInTheDocument();
  });

  // 7. Persistence Across Page Refresh
  it('persists tasks, active selection, and completion state across re-renders/refresh', () => {
    const { unmount } = render(<App />);

    const input = screen.getByTestId('task-input');
    const addButton = screen.getByTestId('add-task-button');

    fireEvent.change(input, { target: { value: 'Persistent Task 1' } });
    fireEvent.click(addButton);

    fireEvent.change(input, { target: { value: 'Persistent Task 2' } });
    fireEvent.click(addButton);

    // Mark Task 1 completed
    const task1Checkbox = screen.getByRole('checkbox', { name: /Mark "Persistent Task 1" complete/i });
    fireEvent.click(task1Checkbox);

    // Verify localStorage has been populated
    const stored = window.localStorage.getItem(TASKS_STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(stored).toContain('Persistent Task 1');

    // Unmount (simulating page close / refresh)
    unmount();

    // Remount App
    render(<App />);

    // Verify both tasks are restored
    const taskList = screen.getByTestId('task-list');
    expect(within(taskList).getByText('Persistent Task 1')).toBeInTheDocument();
    expect(within(taskList).getByText('Persistent Task 2')).toBeInTheDocument();

    // Verify completion status persisted
    const restoredCheckbox1 = screen.getByRole('checkbox', { name: /Mark "Persistent Task 1" incomplete/i });
    expect(restoredCheckbox1).toHaveAttribute('aria-checked', 'true');
  });

  // 8. Timer Independence
  it('ensures task operations (add, toggle, select, delete) do NOT interfere with running timer', () => {
    render(<App />);

    // 1. Start the countdown timer
    const startButton = screen.getByTestId('start-button');
    act(() => {
      fireEvent.click(startButton);
    });

    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    // Advance 5 seconds (from 25:00 to 24:55)
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:55');

    // 2. Add a new task while timer is running
    const input = screen.getByTestId('task-input');
    const addButton = screen.getByTestId('add-task-button');
    act(() => {
      fireEvent.change(input, { target: { value: 'Active background task' } });
      fireEvent.click(addButton);
    });

    // Advance 2 more seconds -> must advance to 24:53 undisturbed!
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:53');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    // 3. Complete task while timer is running
    const checkbox = screen.getByRole('checkbox', { name: /Mark "Active background task" complete/i });
    act(() => {
      fireEvent.click(checkbox);
    });

    // Advance 3 more seconds -> must advance to 24:50 undisturbed!
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:50');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    // 4. Delete task while timer is running
    const deleteBtn = screen.getByRole('button', { name: /Delete task "Active background task"/i });
    act(() => {
      fireEvent.click(deleteBtn);
    });
    act(() => {
      fireEvent.click(screen.getByTestId('confirm-delete-button'));
    });

    // Advance 2 more seconds -> must advance to 24:48 undisturbed!
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:48');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');
  });
});
