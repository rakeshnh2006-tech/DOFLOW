import React from 'react';
import type { DailyGoalProgressItem } from '../types/goals';

interface GoalProgressCardProps {
  item: DailyGoalProgressItem;
  onConfigureClick?: () => void;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  item,
  onConfigureClick,
}) => {
  if (!item.enabled) {
    return (
      <div
        className="goal-progress-card is-disabled"
        data-testid={`goal-card-${item.id}`}
      >
        <div className="goal-card-header">
          <div className="goal-title-group">
            <span className="goal-icon-badge" aria-hidden="true">
              {item.id === 'tasks' ? '✓' : item.id === 'sessions' ? '🎯' : '⏱️'}
            </span>
            <h4 className="goal-title">{item.title}</h4>
          </div>
          <span className="goal-disabled-badge">Optional (Off)</span>
        </div>
        <p className="goal-disabled-desc">
          Daily task goal is currently turned off. Click to configure.
        </p>
        {onConfigureClick && (
          <button
            type="button"
            className="btn btn-secondary goal-enable-btn"
            onClick={onConfigureClick}
            data-testid={`enable-goal-${item.id}-btn`}
          >
            Enable Task Goal
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`goal-progress-card ${item.isCompleted ? 'is-completed' : ''}`}
      data-testid={`goal-card-${item.id}`}
    >
      <div className="goal-card-header">
        <div className="goal-title-group">
          <span className="goal-icon-badge" aria-hidden="true">
            {item.id === 'tasks' ? '✓' : item.id === 'sessions' ? '🎯' : '⏱️'}
          </span>
          <h4 className="goal-title">{item.title}</h4>
        </div>
        {item.isCompleted ? (
          <span className="goal-badge-completed" data-testid={`goal-completed-badge-${item.id}`}>
            Goal Reached 🎉
          </span>
        ) : (
          <span className="goal-badge-remaining" data-testid={`goal-remaining-badge-${item.id}`}>
            {item.remaining} {item.unit} to go
          </span>
        )}
      </div>

      <div className="goal-numbers-row">
        <div className="goal-current-number">
          <span className="current-val" data-testid={`goal-current-${item.id}`}>
            {item.current}
          </span>
          <span className="target-val">
            / {item.target} {item.unit}
          </span>
        </div>
        <span className="goal-percent-text" data-testid={`goal-percent-${item.id}`}>
          {item.percent}%
        </span>
      </div>

      <div
        className="goal-progress-bar-track"
        role="progressbar"
        aria-valuenow={item.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${item.title} progress`}
      >
        <div
          className={`goal-progress-bar-fill ${item.isCompleted ? 'completed-fill' : ''}`}
          style={{ width: `${item.percent}%` }}
        />
      </div>
    </div>
  );
};
