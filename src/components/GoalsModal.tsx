import React, { useEffect, useState } from 'react';
import type { DailyGoalsConfig } from '../types/goals';

interface GoalsModalProps {
  isOpen: boolean;
  currentGoals: DailyGoalsConfig;
  onSave: (newGoals: DailyGoalsConfig) => void;
  onClose: () => void;
}

interface GoalsFormContentProps {
  currentGoals: DailyGoalsConfig;
  onSave: (newGoals: DailyGoalsConfig) => void;
  onClose: () => void;
}

const GoalsFormContent: React.FC<GoalsFormContentProps> = ({
  currentGoals,
  onSave,
  onClose,
}) => {
  const [focusMinutes, setFocusMinutes] = useState<number>(currentGoals.targetFocusMinutes);
  const [focusSessions, setFocusSessions] = useState<number>(currentGoals.targetFocusSessions);
  const [tasksEnabled, setTasksEnabled] = useState<boolean>(currentGoals.tasksGoalEnabled);
  const [taskCount, setTaskCount] = useState<number>(currentGoals.targetCompletedTasks);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!Number.isInteger(focusMinutes) || focusMinutes < 1 || focusMinutes > 720) {
      setValidationError('Focus minutes target must be a whole number between 1 and 720.');
      return;
    }

    if (!Number.isInteger(focusSessions) || focusSessions < 1 || focusSessions > 48) {
      setValidationError('Focus sessions target must be a whole number between 1 and 48.');
      return;
    }

    if (tasksEnabled && (!Number.isInteger(taskCount) || taskCount < 1 || taskCount > 50)) {
      setValidationError('Tasks target must be a whole number between 1 and 50.');
      return;
    }

    onSave({
      targetFocusMinutes: focusMinutes,
      targetFocusSessions: focusSessions,
      tasksGoalEnabled: tasksEnabled,
      targetCompletedTasks: taskCount,
    });

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {validationError && (
        <div
          className="alert-banner alert-banner-danger"
          role="alert"
          data-testid="goals-validation-error"
        >
          {validationError}
        </div>
      )}

      {/* Target Focus Minutes */}
      <div className="setting-field">
        <label htmlFor="goal-minutes-input" className="setting-label">
          Daily Focus Time (minutes)
        </label>
        <div className="setting-control-row">
          <input
            id="goal-minutes-input"
            type="number"
            min={1}
            max={720}
            step={1}
            className="setting-input"
            value={focusMinutes}
            onChange={(e) => {
              setFocusMinutes(parseInt(e.target.value, 10) || 0);
              setValidationError(null);
            }}
            data-testid="goal-minutes-input"
          />
          <span className="setting-unit-hint">minutes (1 – 720)</span>
        </div>
      </div>

      {/* Target Focus Sessions */}
      <div className="setting-field">
        <label htmlFor="goal-sessions-input" className="setting-label">
          Daily Focus Sessions
        </label>
        <div className="setting-control-row">
          <input
            id="goal-sessions-input"
            type="number"
            min={1}
            max={48}
            step={1}
            className="setting-input"
            value={focusSessions}
            onChange={(e) => {
              setFocusSessions(parseInt(e.target.value, 10) || 0);
              setValidationError(null);
            }}
            data-testid="goal-sessions-input"
          />
          <span className="setting-unit-hint">sessions (1 – 48)</span>
        </div>
      </div>

      {/* Optional Daily Task Goal Toggle */}
      <div className="setting-field toggle-field">
        <div className="setting-label-group">
          <label htmlFor="goal-tasks-toggle" className="setting-label">
            Daily Completed Tasks Target
          </label>
          <span className="setting-description">
            Track daily completed tasks towards a target
          </span>
        </div>
        <input
          id="goal-tasks-toggle"
          type="checkbox"
          className="setting-checkbox"
          checked={tasksEnabled}
          onChange={(e) => setTasksEnabled(e.target.checked)}
          data-testid="goal-tasks-toggle"
        />
      </div>

      {/* Task Count Input (only if enabled) */}
      {tasksEnabled && (
        <div className="setting-field" data-testid="goal-tasks-count-wrapper">
          <label htmlFor="goal-tasks-input" className="setting-label">
            Target Tasks per Day
          </label>
          <div className="setting-control-row">
            <input
              id="goal-tasks-input"
              type="number"
              min={1}
              max={50}
              step={1}
              className="setting-input"
              value={taskCount}
              onChange={(e) => {
                setTaskCount(parseInt(e.target.value, 10) || 0);
                setValidationError(null);
              }}
              data-testid="goal-tasks-input"
            />
            <span className="setting-unit-hint">tasks (1 – 50)</span>
          </div>
        </div>
      )}

      {/* Modal Actions */}
      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-secondary modal-btn"
          onClick={onClose}
          data-testid="goals-modal-cancel-btn"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary modal-btn"
          data-testid="goals-modal-save-btn"
        >
          Save Daily Goals
        </button>
      </div>
    </form>
  );
};

export const GoalsModal: React.FC<GoalsModalProps> = ({
  isOpen,
  currentGoals,
  onSave,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      data-testid="goals-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card goals-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="goals-modal-title"
        data-testid="goals-modal"
      >
        <div className="modal-header">
          <h3 id="goals-modal-title" className="modal-title">
            Configure Daily Goals
          </h3>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
            data-testid="goals-modal-close-btn"
          >
            ✕
          </button>
        </div>

        <GoalsFormContent
          key={JSON.stringify(currentGoals)}
          currentGoals={currentGoals}
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
