import React, { useState } from 'react';
import type { Task } from '../types/task';
import type { TaskRecommendation } from '../types/intelligence';

interface TaskRecommendationCardProps {
  primaryRecommendation: TaskRecommendation | null;
  allEligibleTasks: Task[];
  activeTaskId: string | null;
  dismissedCount: number;
  onFocusTask: (taskId: string) => void;
  onDismissRecommendation: (taskId: string) => void;
  onResetDismissals: () => void;
}

export const TaskRecommendationCard: React.FC<TaskRecommendationCardProps> = ({
  primaryRecommendation,
  allEligibleTasks,
  activeTaskId,
  dismissedCount,
  onFocusTask,
  onDismissRecommendation,
  onResetDismissals,
}) => {
  const [selectedManualId, setSelectedManualId] = useState('');

  const handleManualSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const taskId = e.target.value;
    setSelectedManualId(taskId);
    if (taskId) {
      onFocusTask(taskId);
    }
  };

  return (
    <section className="intelligence-card task-rec-card" data-testid="task-recommendation-card">
      <div className="intelligence-card-header">
        <div>
          <span className="intelligence-badge">Intelligent Ranking</span>
          <h3 className="intelligence-card-title">Recommended Next Task</h3>
          <p className="intelligence-card-subtitle">
            Ranked by priority, deadline urgency, daily planner flags, and your flow momentum.
          </p>
        </div>

        {dismissedCount > 0 && (
          <button
            type="button"
            className="btn-text-subtle"
            onClick={onResetDismissals}
            data-testid="reset-dismissals-btn"
          >
            Reset Dismissals ({dismissedCount})
          </button>
        )}
      </div>

      {primaryRecommendation ? (
        <div className="task-rec-body" data-testid="recommended-task-content">
          <div className="task-rec-main">
            <div className="task-rec-title-row">
              <h4 className="task-rec-title" data-testid="recommended-task-title">
                {primaryRecommendation.task.title}
              </h4>
              <div className="task-rec-badges">
                <span
                  className={`task-priority-badge priority-${primaryRecommendation.priority}`}
                  data-testid="recommended-task-priority"
                >
                  {primaryRecommendation.priority.toUpperCase()}
                </span>
                {primaryRecommendation.isTodayPriority && (
                  <span className="task-top-badge" data-testid="recommended-task-top-flag">
                    ★ Top Priority
                  </span>
                )}
                {primaryRecommendation.isOverdue && (
                  <span className="task-overdue-badge" data-testid="recommended-task-overdue-flag">
                    Overdue
                  </span>
                )}
                {primaryRecommendation.task.id === activeTaskId && (
                  <span className="task-active-badge">Active Focus Goal</span>
                )}
              </div>
            </div>

            <p className="task-rec-reason" data-testid="recommended-task-reason">
              <span className="reason-icon" aria-hidden="true">
                💡
              </span>{' '}
              {primaryRecommendation.reason}
            </p>
          </div>

          {/* Action Row */}
          <div className="task-rec-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onFocusTask(primaryRecommendation.task.id)}
              data-testid="focus-recommended-btn"
            >
              Focus on this Task →
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onDismissRecommendation(primaryRecommendation.task.id)}
              data-testid="dismiss-recommendation-btn"
            >
              Dismiss / Next
            </button>
          </div>
        </div>
      ) : (
        <div className="task-rec-empty" data-testid="no-recommendations-empty">
          <div className="empty-icon-wrap" aria-hidden="true">
            🎉
          </div>
          <h4 className="empty-title">All tasks completed!</h4>
          <p className="empty-desc">
            You have no pending tasks. Plan a new task in Daily Planner or start an untracked focus sprint.
          </p>
          {dismissedCount > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onResetDismissals}
              data-testid="empty-reset-dismissals-btn"
            >
              Show {dismissedCount} Dismissed Tasks
            </button>
          )}
        </div>
      )}

      {/* Manual Task Switcher */}
      {allEligibleTasks.length > 0 && (
        <div className="manual-task-selector-row">
          <label htmlFor="manual-task-select" className="manual-select-label">
            Or choose another incomplete task:
          </label>
          <select
            id="manual-task-select"
            className="task-input select-input manual-select"
            value={selectedManualId}
            onChange={handleManualSelectChange}
            data-testid="manual-task-select"
          >
            <option value="">-- Choose task manually --</option>
            {allEligibleTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} {t.id === activeTaskId ? '(Current Goal)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
};
