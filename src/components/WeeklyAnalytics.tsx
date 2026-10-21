import React, { useMemo, useState } from 'react';
import type { CompletedSessionRecord } from '../types/stats';
import type { Task } from '../types/task';
import type { DateRangeType } from '../types/analytics';
import {
  calculateWeeklyMetrics,
  getDaysInRange,
  getLocalDateString,
  getWeekRange,
} from '../utils/analyticsUtils';
import { WeeklyBarChart } from './WeeklyBarChart';

interface WeeklyAnalyticsProps {
  sessionHistory: CompletedSessionRecord[];
  tasks: Task[];
  onNavigate?: (view: 'timer' | 'planner' | 'analytics') => void;
}

export const WeeklyAnalytics: React.FC<WeeklyAnalyticsProps> = ({
  sessionHistory,
  tasks,
  onNavigate,
}) => {
  const [rangeType, setRangeType] = useState<DateRangeType>('this-week');
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Custom date range state (defaults to past 7 days)
  const todayStr = useMemo(() => getLocalDateString(), []);
  const defaultCustomStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return getLocalDateString(d.getTime());
  }, []);

  const [customStart, setCustomStart] = useState<string>(defaultCustomStart);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);

  // Calculate day arrays based on range selection
  const { currentDays, previousDays } = useMemo(() => {
    if (rangeType === 'this-week') {
      const thisWeek = getWeekRange(new Date(), 0);
      const lastWeek = getWeekRange(new Date(), -1);
      return { currentDays: thisWeek.days, previousDays: lastWeek.days };
    }

    if (rangeType === 'last-week') {
      const lastWeek = getWeekRange(new Date(), -1);
      const twoWeeksAgo = getWeekRange(new Date(), -2);
      return { currentDays: lastWeek.days, previousDays: twoWeeksAgo.days };
    }

    // Custom Range
    const customDays = getDaysInRange(customStart, customEnd);
    return { currentDays: customDays, previousDays: undefined };
  }, [rangeType, customStart, customEnd]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    return calculateWeeklyMetrics({
      days: currentDays,
      sessionHistory,
      tasks,
      rangeType,
      previousDays,
    });
  }, [currentDays, sessionHistory, tasks, rangeType, previousDays]);

  // Format total focus duration nicely (e.g. "2h 15m" if >= 60m)
  const formattedTotalDuration = useMemo(() => {
    const mins = metrics.totalFocusMinutes;
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }, [metrics.totalFocusMinutes]);

  return (
    <div className="analytics-page" data-testid="weekly-analytics-page">
      {/* Page Header & Range Selector */}
      <section className="analytics-header-section">
        <div className="analytics-header-titles">
          <div className="analytics-tag-badge">Productivity Insights</div>
          <h2 className="analytics-page-title">Weekly Analytics</h2>
          <p className="analytics-range-heading" data-testid="analytics-range-display">
            {metrics.formattedRange}
          </p>
        </div>

        {/* Range Selector Controls */}
        <div className="analytics-range-controls">
          <div className="range-segmented-group" role="tablist" aria-label="Select Date Range">
            <button
              type="button"
              role="tab"
              aria-selected={rangeType === 'this-week'}
              className={`range-tab-btn ${rangeType === 'this-week' ? 'active' : ''}`}
              onClick={() => setRangeType('this-week')}
              data-testid="range-this-week"
            >
              This Week
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rangeType === 'last-week'}
              className={`range-tab-btn ${rangeType === 'last-week' ? 'active' : ''}`}
              onClick={() => setRangeType('last-week')}
              data-testid="range-last-week"
            >
              Last Week
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={rangeType === 'custom'}
              className={`range-tab-btn ${rangeType === 'custom' ? 'active' : ''}`}
              onClick={() => setRangeType('custom')}
              data-testid="range-custom"
            >
              Custom Range
            </button>
          </div>

          {/* Custom Date Inputs if Custom Range is active */}
          {rangeType === 'custom' && (
            <div className="custom-range-inputs" data-testid="custom-range-picker">
              <div className="custom-date-field">
                <label htmlFor="custom-range-start">From</label>
                <input
                  id="custom-range-start"
                  type="date"
                  className="task-input date-input"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  data-testid="custom-start-input"
                />
              </div>
              <div className="custom-date-field">
                <label htmlFor="custom-range-end">To</label>
                <input
                  id="custom-range-end"
                  type="date"
                  className="task-input date-input"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  data-testid="custom-end-input"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5 Key Metric Cards */}
      <section className="analytics-summary-grid" aria-label="Weekly summary statistics">
        {/* 1. Total Focus Time */}
        <div className="metric-card" data-testid="metric-total-focus">
          <div className="metric-top">
            <span className="metric-label">Total Focus Time</span>
            <div className="metric-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{formattedTotalDuration}</div>
          <div className="metric-subtext">Total recorded focus duration</div>
        </div>

        {/* 2. Completed Focus Sessions */}
        <div className="metric-card" data-testid="metric-focus-sessions">
          <div className="metric-top">
            <span className="metric-label">Focus Sessions</span>
            <div className="metric-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{metrics.totalFocusSessions}</div>
          <div className="metric-subtext">Completed to zero without early resets</div>
        </div>

        {/* 3. Completed Tasks */}
        <div className="metric-card" data-testid="metric-completed-tasks">
          <div className="metric-top">
            <span className="metric-label">Tasks Completed</span>
            <div className="metric-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{metrics.totalCompletedTasks}</div>
          <div className="metric-subtext">Unique tasks completed in this period</div>
        </div>

        {/* 4. Average Focus Minutes per Day */}
        <div className="metric-card" data-testid="metric-daily-average">
          <div className="metric-top">
            <span className="metric-label">Daily Average</span>
            <div className="metric-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
          </div>
          <div className="metric-value">{metrics.averageFocusMinutesPerDay}m / day</div>
          <div className="metric-subtext" title={metrics.averageDescription}>
            Average across all {metrics.days.length} days
          </div>
        </div>

        {/* 5. Most Productive Day */}
        <div className="metric-card" data-testid="metric-most-productive-day">
          <div className="metric-top">
            <span className="metric-label">Most Productive Day</span>
            <div className="metric-icon-wrap" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
          </div>
          <div className="metric-value">
            {metrics.mostProductiveDay ? metrics.mostProductiveDay.dayFullName : '—'}
          </div>
          <div className="metric-subtext">
            {metrics.mostProductiveDay
              ? `${metrics.mostProductiveDay.focusMinutes} focus minutes recorded`
              : 'No focus activity recorded yet'}
          </div>
        </div>
      </section>

      {/* Week-over-Week Comparison Section */}
      {metrics.comparison && (
        <section className="analytics-comparison-section" aria-label="Period comparison">
          {metrics.comparison.hasPreviousData ? (
            <div className="comparison-card" data-testid="analytics-comparison">
              <div className="comparison-header">
                <h3 className="comparison-title">Comparison with Previous Week</h3>
                <span className="comparison-badge">Historical Trend</span>
              </div>
              <div className="comparison-stats-row">
                {/* Focus Time Delta */}
                <div className="comparison-item">
                  <span className="comparison-item-label">Focus Time</span>
                  <div className="comparison-item-values">
                    <span className="comparison-current">{metrics.totalFocusMinutes}m</span>
                    <span
                      className={`comparison-delta ${
                        metrics.comparison.focusMinutesDiff >= 0 ? 'positive' : 'negative'
                      }`}
                    >
                      {metrics.comparison.focusMinutesDiff >= 0 ? '+' : ''}
                      {metrics.comparison.focusMinutesDiff}m
                      {metrics.comparison.focusMinutesPercentDiff !== null && (
                        <span>
                          {' '}
                          ({metrics.comparison.focusMinutesPercentDiff >= 0 ? '+' : ''}
                          {metrics.comparison.focusMinutesPercentDiff}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="comparison-sub">vs {metrics.comparison.previousTotalFocusMinutes}m last week</span>
                </div>

                {/* Sessions Delta */}
                <div className="comparison-item">
                  <span className="comparison-item-label">Focus Sessions</span>
                  <div className="comparison-item-values">
                    <span className="comparison-current">{metrics.totalFocusSessions}</span>
                    <span
                      className={`comparison-delta ${
                        metrics.comparison.sessionsDiff >= 0 ? 'positive' : 'negative'
                      }`}
                    >
                      {metrics.comparison.sessionsDiff >= 0 ? '+' : ''}
                      {metrics.comparison.sessionsDiff}
                    </span>
                  </div>
                  <span className="comparison-sub">vs {metrics.comparison.previousTotalSessions} last week</span>
                </div>

                {/* Tasks Delta */}
                <div className="comparison-item">
                  <span className="comparison-item-label">Completed Tasks</span>
                  <div className="comparison-item-values">
                    <span className="comparison-current">{metrics.totalCompletedTasks}</span>
                    <span
                      className={`comparison-delta ${
                        metrics.comparison.tasksDiff >= 0 ? 'positive' : 'negative'
                      }`}
                    >
                      {metrics.comparison.tasksDiff >= 0 ? '+' : ''}
                      {metrics.comparison.tasksDiff}
                    </span>
                  </div>
                  <span className="comparison-sub">vs {metrics.comparison.previousTotalTasks} last week</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="comparison-empty-card" data-testid="analytics-comparison-empty">
              <div className="comparison-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div className="comparison-empty-text">
                <strong>Previous Week Comparison:</strong> No activity recorded in the prior week. Complete focus sessions across multiple weeks to see comparative trends.
              </div>
            </div>
          )}
        </section>
      )}

      {/* 7-Day Bar Chart */}
      <section className="analytics-chart-section">
        <WeeklyBarChart
          days={metrics.days}
          activeDate={selectedDayDate}
          onSelectDay={(d) => setSelectedDayDate((prev) => (prev === d ? null : d))}
        />
      </section>

      {/* Daily Breakdown Table */}
      <section className="analytics-breakdown-section" data-testid="daily-breakdown-section">
        <div className="breakdown-header">
          <h3 className="breakdown-title">Daily Breakdown</h3>
          <span className="breakdown-subtitle">Detailed breakdown of sessions and completed tasks</span>
        </div>

        <div className="breakdown-table-wrapper">
          <table className="breakdown-table" role="table" aria-label="Daily productivity breakdown table">
            <thead>
              <tr>
                <th scope="col">Day & Date</th>
                <th scope="col">Focus Time</th>
                <th scope="col">Focus Sessions</th>
                <th scope="col">Completed Tasks</th>
                <th scope="col">Highlights</th>
              </tr>
            </thead>
            <tbody>
              {metrics.days.map((day) => {
                const isSelected = selectedDayDate === day.date;
                return (
                  <tr
                    key={day.date}
                    className={`breakdown-row ${day.isToday ? 'row-today' : ''} ${
                      isSelected ? 'row-selected' : ''
                    }`}
                    data-testid={`daily-breakdown-row-${day.date}`}
                    onClick={() => setSelectedDayDate((prev) => (prev === day.date ? null : day.date))}
                  >
                    <td>
                      <div className="breakdown-day-cell">
                        <span className="day-full-name">{day.dayFullName}</span>
                        <span className="day-date-str">{day.formattedDate}</span>
                      </div>
                    </td>
                    <td>
                      <div className="breakdown-focus-cell">
                        <span className="focus-minutes-text">{day.focusMinutes} min</span>
                        {day.focusMinutes > 0 && (
                          <div className="focus-mini-bar" aria-hidden="true">
                            <div
                              className="focus-mini-fill"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(10, Math.round((day.focusMinutes / 120) * 100))
                                )}%`,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="count-pill">{day.focusSessions}</span>
                    </td>
                    <td>
                      <span className="count-pill">{day.completedTasks}</span>
                    </td>
                    <td>
                      <div className="breakdown-highlights">
                        {day.isToday && <span className="highlight-tag today-tag">Today</span>}
                        {day.isMostProductive && (
                          <span className="highlight-tag top-tag">★ Top Day</span>
                        )}
                        {!day.isToday && !day.isMostProductive && day.focusMinutes === 0 && (
                          <span className="highlight-tag rest-tag">No focus</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Empty State Banner if 0 activity */}
      {!metrics.hasActivity && (
        <section className="analytics-empty-state" data-testid="analytics-empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h3 className="empty-state-title">No Focus Activity Recorded Yet</h3>
          <p className="empty-state-text">
            Start a focus session with the Pomodoro timer or check off tasks in the Daily Planner to begin building your weekly productivity statistics.
          </p>
          {onNavigate && (
            <button
              type="button"
              className="btn btn-primary empty-state-btn"
              onClick={() => onNavigate('timer')}
              data-testid="analytics-start-focus-btn"
            >
              Start Focus Session
            </button>
          )}
        </section>
      )}
    </div>
  );
};
