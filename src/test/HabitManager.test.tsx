import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { App } from '../App';
import { HABITS_STORAGE_KEY, HABIT_COMPLETIONS_STORAGE_KEY } from '../utils/habitStorage';
import type { Habit, HabitCompletion } from '../types/habit';

describe('HabitManager and Feature 9 Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const navigateToHabitsView = () => {
    const habitsNavBtn = screen.getByTestId('nav-habits');
    fireEvent.click(habitsNavBtn);
  };

  it('renders navigation button and switches to Habits & Streaks view', () => {
    render(<App />);

    const habitsNavBtn = screen.getByTestId('nav-habits');
    expect(habitsNavBtn).toBeDefined();

    navigateToHabitsView();

    expect(screen.getByTestId('habit-manager-page')).toBeDefined();
    expect(screen.getByText('Habits & Streaks')).toBeDefined();
    expect(screen.getByTestId('create-habit-btn')).toBeDefined();
  });

  it('shows empty state when no habits have been created', () => {
    render(<App />);
    navigateToHabitsView();

    expect(screen.getByTestId('habits-empty-state')).toBeDefined();
    expect(screen.getByText('No habits found')).toBeDefined();
  });

  it('validates habit creation form and rejects empty name', () => {
    render(<App />);
    navigateToHabitsView();

    // Click "New Habit"
    fireEvent.click(screen.getByTestId('create-habit-btn'));
    expect(screen.getByTestId('habit-modal')).toBeDefined();

    // Try submitting with empty name
    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));

    expect(screen.getByTestId('habit-validation-error')).toBeDefined();
    expect(screen.getByText('Please enter a habit name.')).toBeDefined();

    // Close modal
    fireEvent.click(screen.getByTestId('habit-modal-close-btn'));
    expect(screen.queryByTestId('habit-modal')).toBeNull();
  });

  it('creates a daily habit and renders it in the active list', () => {
    render(<App />);
    navigateToHabitsView();

    // Open modal
    fireEvent.click(screen.getByTestId('create-habit-btn'));

    // Fill in name and description
    fireEvent.change(screen.getByTestId('habit-name-input'), {
      target: { value: 'Morning Meditation' },
    });
    fireEvent.change(screen.getByTestId('habit-desc-input'), {
      target: { value: '10 minutes of mindfulness' },
    });

    // Submit
    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));

    // Modal closes
    expect(screen.queryByTestId('habit-modal')).toBeNull();

    // Habit card is displayed
    expect(screen.getByText('Morning Meditation')).toBeDefined();
    expect(screen.getByText('10 minutes of mindfulness')).toBeDefined();
    expect(screen.getByText('Every day')).toBeDefined();
  });

  it('creates a custom schedule habit and requires at least one day selected', () => {
    render(<App />);
    navigateToHabitsView();

    fireEvent.click(screen.getByTestId('create-habit-btn'));
    fireEvent.change(screen.getByTestId('habit-name-input'), {
      target: { value: 'Gym Workout' },
    });

    // Select Custom Days
    fireEvent.click(screen.getByTestId('habit-freq-custom'));
    expect(screen.getByTestId('habit-custom-days-picker')).toBeDefined();

    // Deselect all default days [1, 2, 3, 4, 5]
    [1, 2, 3, 4, 5].forEach((day) => {
      fireEvent.click(screen.getByTestId(`habit-day-toggle-${day}`));
    });

    // Try submit with 0 days
    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));
    expect(
      screen.getByText('Please select at least one day of the week for custom schedule.')
    ).toBeDefined();

    // Select Mon (1) and Wed (3)
    fireEvent.click(screen.getByTestId('habit-day-toggle-1'));
    fireEvent.click(screen.getByTestId('habit-day-toggle-3'));

    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));
    expect(screen.getByText('Gym Workout')).toBeDefined();
    expect(screen.getByText('Mon, Wed')).toBeDefined();
  });

  it('marks a habit complete for today and undoes the completion with recalculation', () => {
    render(<App />);
    navigateToHabitsView();

    // Create habit
    fireEvent.click(screen.getByTestId('create-habit-btn'));
    fireEvent.change(screen.getByTestId('habit-name-input'), {
      target: { value: 'Read 15 Pages' },
    });
    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));

    // Habit card is rendered
    expect(screen.getByText('Read 15 Pages')).toBeDefined();

    // Find habit card checkbox
    const checkbox = screen.getByRole('checkbox', { name: /Mark Read 15 Pages complete/i });
    expect(checkbox.getAttribute('aria-checked')).toBe('false');

    // Mark complete
    fireEvent.click(checkbox);
    expect(checkbox.getAttribute('aria-checked')).toBe('true');

    // Undo completion
    fireEvent.click(checkbox);
    expect(checkbox.getAttribute('aria-checked')).toBe('false');
  });

  it('allows editing an existing habit', () => {
    render(<App />);
    navigateToHabitsView();

    // Create habit
    fireEvent.click(screen.getByTestId('create-habit-btn'));
    fireEvent.change(screen.getByTestId('habit-name-input'), {
      target: { value: 'Stretching' },
    });
    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));

    // Click Edit button
    const editBtn = screen.getByRole('button', { name: /Edit Stretching/i });
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Habit')).toBeDefined();
    const nameInput = screen.getByTestId('habit-name-input') as HTMLInputElement;
    expect(nameInput.value).toBe('Stretching');

    // Update name
    fireEvent.change(nameInput, { target: { value: 'Evening Stretching & Mobility' } });
    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));

    expect(screen.getByText('Evening Stretching & Mobility')).toBeDefined();
  });

  it('archives, filters, and unarchives a habit', () => {
    render(<App />);
    navigateToHabitsView();

    // Create habit
    fireEvent.click(screen.getByTestId('create-habit-btn'));
    fireEvent.change(screen.getByTestId('habit-name-input'), {
      target: { value: 'Deep Breathing' },
    });
    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));

    // Archive habit
    const archiveBtn = screen.getByRole('button', { name: /Archive Deep Breathing/i });
    fireEvent.click(archiveBtn);

    // In Active filter, it is now hidden
    expect(screen.queryByText('Deep Breathing')).toBeNull();

    // Switch to Archived filter
    fireEvent.click(screen.getByTestId('habit-filter-archived'));
    expect(screen.getByText('Deep Breathing')).toBeDefined();
    expect(screen.getAllByText('Archived').length).toBeGreaterThan(0);

    // Unarchive (button has label "Restore Deep Breathing")
    const unarchiveBtn = screen.getByRole('button', { name: /Restore Deep Breathing/i });
    fireEvent.click(unarchiveBtn);

    // Now empty in Archived tab
    expect(screen.queryByText('Deep Breathing')).toBeNull();

    // Switch back to Active filter
    fireEvent.click(screen.getByTestId('habit-filter-active'));
    expect(screen.getByText('Deep Breathing')).toBeDefined();
  });

  it('opens calendar history view for a habit and closes it', () => {
    render(<App />);
    navigateToHabitsView();

    // Create habit
    fireEvent.click(screen.getByTestId('create-habit-btn'));
    fireEvent.change(screen.getByTestId('habit-name-input'), {
      target: { value: 'Journaling' },
    });
    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));

    // Click Calendar history action
    const calBtn = screen.getByRole('button', {
      name: /View completion history calendar for Journaling/i,
    });
    fireEvent.click(calBtn);

    // Calendar is opened
    expect(screen.getByText(/Journaling — Completion History/i)).toBeDefined();
    expect(screen.getByTestId('calendar-prev-month-btn')).toBeDefined();
    expect(screen.getByTestId('calendar-next-month-btn')).toBeDefined();

    // Close calendar
    fireEvent.click(screen.getByTestId('calendar-close-btn'));
    expect(screen.queryByText(/Journaling — Completion History/i)).toBeNull();
  });

  it('deletes a habit with confirmation modal', () => {
    render(<App />);
    navigateToHabitsView();

    // Create habit
    fireEvent.click(screen.getByTestId('create-habit-btn'));
    fireEvent.change(screen.getByTestId('habit-name-input'), {
      target: { value: 'Temporary Habit' },
    });
    fireEvent.click(screen.getByTestId('habit-modal-submit-btn'));

    expect(screen.getByText('Temporary Habit')).toBeDefined();

    // Click Delete button
    const deleteBtn = screen.getByRole('button', { name: /Delete Temporary Habit/i });
    fireEvent.click(deleteBtn);

    // Confirmation dialog appears
    const deleteModal = screen.getByTestId('delete-habit-modal');
    expect(deleteModal).toBeDefined();
    expect(within(deleteModal).getByRole('heading', { name: 'Delete Habit' })).toBeDefined();

    // Cancel deletion
    fireEvent.click(screen.getByTestId('cancel-delete-habit-btn'));
    expect(screen.queryByTestId('delete-habit-modal')).toBeNull();
    expect(screen.getByText('Temporary Habit')).toBeDefined();

    // Click Delete again and confirm
    fireEvent.click(deleteBtn);
    fireEvent.click(screen.getByTestId('confirm-delete-habit-btn'));

    expect(screen.queryByTestId('delete-habit-modal')).toBeNull();
    expect(screen.queryByText('Temporary Habit')).toBeNull();
  });

  it('restores habits and completions from localStorage on reload', () => {
    const existingHabits: Habit[] = [
      {
        id: 'persisted-habit-1',
        name: 'Cold Shower',
        description: 'Morning alertness',
        frequency: 'daily',
        createdAt: 1729400000000,
        archived: false,
      },
    ];

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const existingCompletions: HabitCompletion[] = [
      {
        id: 'comp-persisted-1',
        habitId: 'persisted-habit-1',
        date: todayStr,
        completedAt: 1729410000000,
      },
    ];

    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(existingHabits));
    localStorage.setItem(HABIT_COMPLETIONS_STORAGE_KEY, JSON.stringify(existingCompletions));

    render(<App />);
    navigateToHabitsView();

    expect(screen.getByText('Cold Shower')).toBeDefined();
    expect(screen.getByText('Morning alertness')).toBeDefined();

    // Checkbox should be checked
    const checkbox = screen.getByRole('checkbox', { name: /Mark Cold Shower incomplete/i });
    expect(checkbox.getAttribute('aria-checked')).toBe('true');

    // Streak badge should show 1
    const streakBadge = screen.getByTestId('habit-streak-current-persisted-habit-1');
    expect(within(streakBadge).getByText('1')).toBeDefined();
  });

  it('period selector switches between 7D, 30D, Month, and All Time', () => {
    render(<App />);
    navigateToHabitsView();

    const pill7d = screen.getByTestId('habit-period-7days');
    const pill30d = screen.getByTestId('habit-period-30days');
    const pillMonth = screen.getByTestId('habit-period-month');
    const pillAll = screen.getByTestId('habit-period-all');

    expect(pill30d.className).toContain('active');

    fireEvent.click(pill7d);
    expect(pill7d.className).toContain('active');

    fireEvent.click(pillMonth);
    expect(pillMonth.className).toContain('active');

    fireEvent.click(pillAll);
    expect(pillAll.className).toContain('active');
  });
});
