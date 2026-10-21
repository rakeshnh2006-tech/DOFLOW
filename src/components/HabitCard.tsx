import React from 'react';
import type { HabitWithStreak } from '../types/habit';

interface HabitCardProps {
  habit: HabitWithStreak;
  onToggleComplete: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onToggleCalendar: () => void;
  isCalendarOpen?: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const HabitCard: React.FC<HabitCardProps> = ({
  habit,
  onToggleComplete,
  onEdit,
  onArchive,
  onDelete,
  onToggleCalendar,
  isCalendarOpen = false,
}) => {
  const { streak } = habit;

  const formatSchedule = () => {
    if (habit.frequency === 'daily') return 'Every day';
    if (habit.frequency === 'weekdays') return 'Weekdays (Mon–Fri)';
    if (habit.customDays && habit.customDays.length > 0) {
      return habit.customDays.map((d) => DAY_NAMES[d]).join(', ');
    }
    return 'Custom';
  };

  return (
    <div
      className={`habit-card ${streak.isCompletedToday ? 'is-completed' : ''} ${
        habit.archived ? 'is-archived' : ''
      }`}
      data-testid={`habit-card-${habit.id}`}
    >
      <div className="habit-card-main">
        {/* Left: Checkbox / Completion Toggle */}
        <div className="habit-check-wrapper">
          {streak.isScheduledToday ? (
            <button
              type="button"
              role="checkbox"
              aria-checked={streak.isCompletedToday}
              className={`habit-checkbox ${streak.isCompletedToday ? 'checked' : ''}`}
              onClick={onToggleComplete}
              aria-label={
                streak.isCompletedToday
                  ? `Mark ${habit.name} incomplete`
                  : `Mark ${habit.name} complete for today`
              }
              data-testid={`habit-check-${habit.id}`}
            >
              {streak.isCompletedToday && (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ) : (
            <span
              className="habit-rest-pill"
              title="Not scheduled for today"
              data-testid={`habit-rest-pill-${habit.id}`}
            >
              Rest
            </span>
          )}
        </div>

        {/* Center: Details */}
        <div className="habit-info-group">
          <div className="habit-title-row">
            <h4
              className={`habit-title ${streak.isCompletedToday ? 'completed-text' : ''}`}
              data-testid={`habit-title-${habit.id}`}
            >
              {habit.name}
            </h4>
            {habit.archived && <span className="habit-archived-badge">Archived</span>}
          </div>

          {habit.description && <p className="habit-desc">{habit.description}</p>}

          <div className="habit-meta-row">
            <span className="habit-schedule-tag">{formatSchedule()}</span>
            <span className="habit-meta-separator">•</span>
            <span className="habit-rate-tag" title="Completion rate for selected window">
              {streak.completionRatePercent}% consistency
            </span>
          </div>
        </div>

        {/* Right: Streak Metrics Display */}
        <div className="habit-streaks-display">
          <div
            className={`streak-metric-badge current-streak ${
              streak.currentStreak > 0 ? 'active-streak' : ''
            }`}
            title="Current consecutive streak"
            data-testid={`habit-streak-current-${habit.id}`}
          >
            <span className="streak-icon" aria-hidden="true">
              🔥
            </span>
            <div className="streak-values">
              <span className="streak-number">{streak.currentStreak}</span>
              <span className="streak-label">streak</span>
            </div>
          </div>

          <div
            className="streak-metric-badge longest-streak"
            title="All-time longest streak"
            data-testid={`habit-streak-longest-${habit.id}`}
          >
            <span className="streak-icon" aria-hidden="true">
              ★
            </span>
            <div className="streak-values">
              <span className="streak-number">{streak.longestStreak}</span>
              <span className="streak-label">best</span>
            </div>
          </div>
        </div>

        {/* Card Action Controls */}
        <div className="habit-actions-group">
          <button
            type="button"
            className={`btn-habit-action ${isCalendarOpen ? 'active' : ''}`}
            onClick={onToggleCalendar}
            aria-label={`View completion history calendar for ${habit.name}`}
            title="View completion calendar"
            data-testid={`habit-calendar-btn-${habit.id}`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>

          <button
            type="button"
            className="btn-habit-action"
            onClick={onEdit}
            aria-label={`Edit ${habit.name}`}
            title="Edit habit"
            data-testid={`habit-edit-btn-${habit.id}`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>

          <button
            type="button"
            className="btn-habit-action"
            onClick={onArchive}
            aria-label={habit.archived ? `Restore ${habit.name}` : `Archive ${habit.name}`}
            title={habit.archived ? 'Restore habit' : 'Archive habit'}
            data-testid={`habit-archive-btn-${habit.id}`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
          </button>

          <button
            type="button"
            className="btn-habit-action btn-danger-action"
            onClick={onDelete}
            aria-label={`Delete ${habit.name}`}
            title="Delete habit"
            data-testid={`habit-delete-btn-${habit.id}`}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
