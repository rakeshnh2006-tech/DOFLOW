import React from 'react';
import type { DailyProductivityStats } from '../types/stats';

interface DailyStatsProps {
  stats: DailyProductivityStats;
}

export const DailyStats: React.FC<DailyStatsProps> = ({ stats }) => {
  const {
    completedFocusSessions,
    totalFocusMinutes,
    completedTasks,
    hasActivity,
  } = stats;

  return (
    <section
      className="daily-stats-section"
      aria-label="Daily Productivity Statistics"
      data-testid="daily-stats-section"
    >
      <div className="stats-header">
        <h2 className="stats-title">Today&rsquo;s Overview</h2>
        <span className="stats-date-badge" data-testid="stats-date-badge">
          {stats.date}
        </span>
      </div>

      <div className="stats-grid" role="group" aria-label="Today's productivity metrics">
        {/* Metric 1: Completed Focus Sessions */}
        <div className="stat-card" data-testid="stat-focus-sessions">
          <span className="stat-value" data-testid="stat-focus-sessions-value">
            {completedFocusSessions}
          </span>
          <span className="stat-label">Focus Sessions</span>
        </div>

        {/* Metric 2: Total Focus Time (in minutes) */}
        <div className="stat-card" data-testid="stat-focus-time">
          <span className="stat-value" data-testid="stat-focus-time-value">
            {totalFocusMinutes}
            <span className="stat-unit">m</span>
          </span>
          <span className="stat-label">Focus Time</span>
        </div>

        {/* Metric 3: Completed Tasks */}
        <div className="stat-card" data-testid="stat-completed-tasks">
          <span className="stat-value" data-testid="stat-completed-tasks-value">
            {completedTasks}
          </span>
          <span className="stat-label">Tasks Done</span>
        </div>
      </div>

      {/* Empty State / Notice when no activity has occurred yet */}
      {!hasActivity && (
        <p className="stats-empty-note" data-testid="stats-empty-note">
          No focus activity recorded today yet. Start a session above to begin!
        </p>
      )}
    </section>
  );
};
