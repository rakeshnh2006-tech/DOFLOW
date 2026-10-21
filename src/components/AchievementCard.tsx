import React from 'react';
import type { AchievementProgress } from '../types/goals';
import { getLocalDateString } from '../utils/statsStorage';

interface AchievementCardProps {
  achievement: AchievementProgress;
}

const CATEGORY_ICONS: Record<string, string> = {
  first_focus_session: '🚀',
  five_focus_sessions: '🔥',
  ten_focus_sessions: '👑',
  daily_focus_target_reached: '🎯',
  seven_day_habit_streak: '⚡',
  hundred_focus_minutes: '💯',
  first_task_completed: '✓',
  five_tasks_completed: '📋',
  planner_task_completed: '🗓️',
};

export const AchievementCard: React.FC<AchievementCardProps> = ({ achievement }) => {
  const icon = CATEGORY_ICONS[achievement.id] || '🏆';

  const formattedUnlockedDate = achievement.unlockedAt
    ? getLocalDateString(achievement.unlockedAt)
    : null;

  return (
    <div
      className={`achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}
      data-testid={`achievement-card-${achievement.id}`}
    >
      <div className="achievement-icon-wrapper" aria-hidden="true">
        {achievement.isUnlocked ? (
          <span className="achievement-icon-glyph">{icon}</span>
        ) : (
          <span className="achievement-lock-glyph">🔒</span>
        )}
      </div>

      <div className="achievement-card-body">
        <div className="achievement-header-row">
          <h4 className="achievement-title" data-testid={`achievement-title-${achievement.id}`}>
            {achievement.title}
          </h4>
          <span className={`achievement-category-tag ${achievement.category}`}>
            {achievement.category}
          </span>
        </div>

        <p className="achievement-desc">{achievement.description}</p>

        {achievement.isUnlocked ? (
          <div className="achievement-unlocked-row" data-testid={`achievement-unlocked-${achievement.id}`}>
            <span className="unlocked-check-icon">✓</span>
            <span className="unlocked-text">
              Earned {formattedUnlockedDate ? `on ${formattedUnlockedDate}` : ''}
            </span>
          </div>
        ) : (
          <div className="achievement-locked-progress" data-testid={`achievement-progress-${achievement.id}`}>
            <div className="locked-numbers-row">
              <span className="locked-progress-label">
                {achievement.currentValue} / {achievement.targetValue} {achievement.unit}
              </span>
              <span className="locked-percent-label">{achievement.progressPercent}%</span>
            </div>
            <div
              className="achievement-progress-track"
              role="progressbar"
              aria-valuenow={achievement.progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${achievement.title} progress`}
            >
              <div
                className="achievement-progress-fill"
                style={{ width: `${achievement.progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
