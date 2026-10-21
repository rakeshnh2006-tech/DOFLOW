import React, { useState } from 'react';
import type { Habit, HabitFilter, HabitInput, HabitPeriod } from '../types/habit';
import type { UseHabitsReturn } from '../hooks/useHabits';
import { HabitCard } from './HabitCard';
import { HabitModal } from './HabitModal';
import { HabitCalendarView } from './HabitCalendarView';

interface HabitManagerProps {
  habitsState: UseHabitsReturn;
}

export const HabitManager: React.FC<HabitManagerProps> = ({ habitsState }) => {
  const {
    filteredHabits,
    overallSummary,
    filter,
    period,
    errorMessage,
    setFilter,
    setPeriod,
    createHabit,
    updateHabit,
    toggleArchiveHabit,
    deleteHabit,
    toggleHabitCompletion,
    clearError,
  } = habitsState;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [calendarHabitId, setCalendarHabitId] = useState<string | null>(null);
  const [deletingHabitId, setDeletingHabitId] = useState<string | null>(null);

  const activeCalendarHabit = habitsState.habits.find((h) => h.id === calendarHabitId) || null;

  const handleSaveNew = (input: HabitInput) => {
    return createHabit(input);
  };

  const handleSaveEdit = (input: HabitInput) => {
    if (!editingHabit) return false;
    return updateHabit(editingHabit.id, input);
  };

  const confirmDelete = () => {
    if (deletingHabitId) {
      deleteHabit(deletingHabitId);
      if (calendarHabitId === deletingHabitId) {
        setCalendarHabitId(null);
      }
      setDeletingHabitId(null);
    }
  };

  return (
    <div className="habit-manager-page" data-testid="habit-manager-page">
      {/* Page Header */}
      <section className="habit-header-card">
        <div className="habit-header-content">
          <div className="habit-header-titles">
            <span className="habit-tag-badge">Consistency & Streaks</span>
            <h2 className="habit-page-title">Habits & Streaks</h2>
            <p className="habit-page-subtitle">
              Build daily focus rituals, cultivate momentum, and maintain unbroken streaks without fear of scheduled off-days.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-create-habit"
            onClick={() => setIsCreateModalOpen(true)}
            data-testid="create-habit-btn"
          >
            <span aria-hidden="true">+</span> New Habit
          </button>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="alert-banner alert-banner-danger" role="alert" data-testid="habit-error-alert">
            <span>{errorMessage}</span>
            <button type="button" className="btn-modal-close" onClick={clearError} aria-label="Dismiss error">
              ✕
            </button>
          </div>
        )}

        {/* 4 Summary Cards Grid */}
        <div className="habit-summary-grid" aria-label="Habit summary metrics">
          <div className="habit-metric-card" data-testid="habit-metric-active">
            <span className="habit-metric-label">Active Habits</span>
            <span className="habit-metric-value">{overallSummary.totalActive}</span>
            <span className="habit-metric-sub">Routines being tracked</span>
          </div>

          <div className="habit-metric-card" data-testid="habit-metric-scheduled">
            <span className="habit-metric-label">Scheduled Today</span>
            <span className="habit-metric-value">{overallSummary.scheduledToday}</span>
            <span className="habit-metric-sub">Due on today's schedule</span>
          </div>

          <div className="habit-metric-card" data-testid="habit-metric-completed">
            <span className="habit-metric-label">Completed Today</span>
            <span className="habit-metric-value">{overallSummary.completedToday}</span>
            <span className="habit-metric-sub">
              {overallSummary.remainingToday === 0 && overallSummary.scheduledToday > 0
                ? 'All done for today! 🎉'
                : `${overallSummary.remainingToday} remaining`}
            </span>
          </div>

          <div className="habit-metric-card" data-testid="habit-metric-rate">
            <span className="habit-metric-label">Overall Consistency</span>
            <span className="habit-metric-value">{overallSummary.overallRatePercent}%</span>
            <span className="habit-metric-sub">Across all scheduled days</span>
          </div>
        </div>

        {/* Filters and Period Bar */}
        <div className="habit-toolbar-row">
          {/* Status Filter Tabs */}
          <div className="habit-filter-tabs" role="tablist" aria-label="Habit status filter">
            {(
              [
                { id: 'active', label: 'Active' },
                { id: 'archived', label: 'Archived' },
                { id: 'all', label: 'All' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                className={`habit-tab-btn ${filter === tab.id ? 'active' : ''}`}
                onClick={() => setFilter(tab.id as HabitFilter)}
                data-testid={`habit-filter-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Period selector */}
          <div className="habit-period-group">
            <label htmlFor="habit-period-select" className="sr-only">
              Consistency Period
            </label>
            <div className="period-pills" role="radiogroup" aria-label="Consistency measurement window">
              {(
                [
                  { id: '7days', label: '7D' },
                  { id: '30days', label: '30D' },
                  { id: 'month', label: 'Month' },
                  { id: 'all', label: 'All' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={period === p.id}
                  className={`period-pill-btn ${period === p.id ? 'active' : ''}`}
                  onClick={() => setPeriod(p.id as HabitPeriod)}
                  data-testid={`habit-period-${p.id}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Habits List or Empty State */}
      <section className="habits-list-section" aria-label="Habits list">
        {filteredHabits.length === 0 ? (
          <div className="habits-empty-state" data-testid="habits-empty-state">
            <div className="empty-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3 className="empty-title">
              {filter === 'archived'
                ? 'No archived habits'
                : 'No habits found'}
            </h3>
            <p className="empty-subtitle">
              {filter === 'archived'
                ? 'Archived habits will appear here for historical reference.'
                : 'Create your first habit to track daily routines and maintain your focus streak.'}
            </p>
            {filter !== 'archived' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsCreateModalOpen(true)}
                data-testid="empty-create-habit-btn"
              >
                Create a Habit
              </button>
            )}
          </div>
        ) : (
          <div className="habits-grid">
            {filteredHabits.map((habit) => (
              <div key={habit.id} className="habit-card-wrapper">
                <HabitCard
                  habit={habit}
                  onToggleComplete={() => toggleHabitCompletion(habit.id)}
                  onEdit={() => setEditingHabit(habit)}
                  onArchive={() => toggleArchiveHabit(habit.id)}
                  onDelete={() => setDeletingHabitId(habit.id)}
                  onToggleCalendar={() =>
                    setCalendarHabitId((prev) => (prev === habit.id ? null : habit.id))
                  }
                  isCalendarOpen={calendarHabitId === habit.id}
                />

                {/* Inline calendar view when expanded */}
                {calendarHabitId === habit.id && activeCalendarHabit && (
                  <HabitCalendarView
                    habit={activeCalendarHabit}
                    completions={habitsState.completions}
                    onToggleDate={(d) => toggleHabitCompletion(habit.id, d)}
                    onClose={() => setCalendarHabitId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Create Modal */}
      <HabitModal
        isOpen={isCreateModalOpen}
        onSave={handleSaveNew}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Edit Modal */}
      <HabitModal
        isOpen={editingHabit !== null}
        habitToEdit={editingHabit}
        onSave={handleSaveEdit}
        onClose={() => setEditingHabit(null)}
      />

      {/* Delete Confirmation Modal */}
      {deletingHabitId && (
        <div
          className="modal-backdrop"
          role="presentation"
          data-testid="delete-habit-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingHabitId(null);
          }}
        >
          <div
            className="modal-card"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-habit-title"
            data-testid="delete-habit-modal"
          >
            <div className="modal-header">
              <h3 id="delete-habit-title" className="modal-title">
                Delete Habit
              </h3>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setDeletingHabitId(null)}
                aria-label="Cancel deletion"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this habit? All recorded streaks and completion history will be permanently deleted.
              </p>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary modal-btn"
                onClick={() => setDeletingHabitId(null)}
                data-testid="cancel-delete-habit-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn modal-btn modal-btn-danger"
                onClick={confirmDelete}
                data-testid="confirm-delete-habit-btn"
              >
                Delete Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
