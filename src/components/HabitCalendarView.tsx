import React, { useState } from 'react';
import type { Habit, HabitCompletion } from '../types/habit';
import { getHabitMonthCalendar } from '../utils/streakUtils';

interface HabitCalendarViewProps {
  habit: Habit;
  completions: HabitCompletion[];
  onToggleDate?: (dateStr: string) => void;
  onClose?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const HabitCalendarView: React.FC<HabitCalendarViewProps> = ({
  habit,
  completions,
  onToggleDate,
  onClose,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth());

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  const cells = getHabitMonthCalendar({
    habit,
    completions,
    year: currentYear,
    month: currentMonth,
  });

  return (
    <div
      className="habit-calendar-card"
      data-testid={`habit-calendar-view-${habit.id}`}
      role="region"
      aria-label={`Completion history calendar for ${habit.name}`}
    >
      <div className="calendar-header-bar">
        <div className="calendar-title-group">
          <h4 className="calendar-habit-title">{habit.name} — Completion History</h4>
          <span className="calendar-month-display" data-testid="calendar-month-year-title">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
        </div>

        <div className="calendar-nav-actions">
          <button
            type="button"
            className="btn btn-secondary btn-cal-nav"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            data-testid="calendar-prev-month-btn"
          >
            ←
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-cal-nav btn-cal-today"
            onClick={handleGoToday}
            data-testid="calendar-today-btn"
          >
            Today
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-cal-nav"
            onClick={handleNextMonth}
            aria-label="Next month"
            data-testid="calendar-next-month-btn"
          >
            →
          </button>
          {onClose && (
            <button
              type="button"
              className="btn btn-secondary btn-cal-close"
              onClick={onClose}
              aria-label="Close calendar"
              data-testid="calendar-close-btn"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Weekday column headers */}
      <div className="calendar-grid-headers" aria-hidden="true">
        {WEEKDAY_HEADERS.map((day) => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Day Cells */}
      <div className="calendar-grid-days" role="grid">
        {cells.map((cell) => {
          let cellStatus = 'unscheduled';
          if (cell.isCompleted) {
            cellStatus = 'completed';
          } else if (cell.isScheduled) {
            if (cell.isToday) {
              cellStatus = 'pending-today';
            } else if (cell.isFuture) {
              cellStatus = 'future-scheduled';
            } else {
              cellStatus = 'missed';
            }
          }

          const label = `${cell.dateStr}: ${
            cell.isCompleted
              ? 'Completed'
              : cell.isScheduled
              ? cell.isToday
                ? 'Scheduled for today (pending)'
                : cell.isFuture
                ? 'Scheduled (future)'
                : 'Missed scheduled day'
              : 'Not scheduled'
          }`;

          const canClick = !cell.isFuture && onToggleDate;

          return (
            <button
              key={cell.dateStr}
              type="button"
              role="gridcell"
              aria-label={label}
              disabled={!canClick}
              onClick={() => canClick && onToggleDate(cell.dateStr)}
              className={`calendar-cell ${cellStatus} ${cell.isCurrentMonth ? '' : 'outside-month'} ${
                cell.isToday ? 'is-today-cell' : ''
              }`}
              data-testid={`calendar-cell-${cell.dateStr}`}
            >
              <span className="cell-day-num">{cell.dayOfMonth}</span>
              {cell.isCompleted && (
                <span className="cell-check-icon" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Calendar Legend */}
      <div className="calendar-legend-bar" aria-hidden="true">
        <div className="legend-item">
          <span className="legend-dot completed-dot" />
          <span>Completed</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot missed-dot" />
          <span>Missed</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot today-dot" />
          <span>Today</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot unscheduled-dot" />
          <span>Rest / Unscheduled</span>
        </div>
      </div>
    </div>
  );
};
