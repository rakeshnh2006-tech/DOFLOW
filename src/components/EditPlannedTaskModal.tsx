import React, { useEffect, useState } from 'react';
import type { PlannedTask, PlannedTaskInput, PlannerPriority } from '../types/planner';

interface EditPlannedTaskModalProps {
  task: PlannedTask | null;
  onSave: (id: string, updates: Partial<PlannedTaskInput>) => { success: boolean; error?: string };
  onClose: () => void;
}

interface EditPlannedTaskDialogProps {
  task: PlannedTask;
  onSave: (id: string, updates: Partial<PlannedTaskInput>) => { success: boolean; error?: string };
  onClose: () => void;
}

const EditPlannedTaskDialog: React.FC<EditPlannedTaskDialogProps> = ({
  task,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(task.title);
  const [startTime, setStartTime] = useState(task.startTime ?? '');
  const [deadline, setDeadline] = useState(task.deadline ?? '');
  const [priority, setPriority] = useState<PlannerPriority>(task.priority);
  const [isTodayPriority, setIsTodayPriority] = useState(Boolean(task.isTodayPriority));
  const [inProgress, setInProgress] = useState(Boolean(task.inProgress));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onSave(task.id, {
      title,
      startTime: startTime || undefined,
      deadline: deadline || undefined,
      priority,
      isTodayPriority,
      inProgress,
    });

    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error ?? 'Validation failed.');
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      data-testid="edit-planned-task-modal"
    >
      <div
        className="modal-card edit-task-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title"
      >
        <div className="modal-header">
          <h3 id="edit-task-title" className="modal-title">
            Edit Planned Task
          </h3>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close edit dialog"
            data-testid="close-edit-modal-button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {errorMessage && (
            <div
              className="settings-error-alert"
              role="alert"
              data-testid="edit-task-error"
            >
              {errorMessage}
            </div>
          )}

          <div className="setting-field">
            <label htmlFor="edit-task-title-input" className="setting-label">
              Task Description
            </label>
            <input
              id="edit-task-title-input"
              type="text"
              className="task-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrorMessage(null);
              }}
              required
              data-testid="edit-task-title-input"
            />
          </div>

          <div className="planner-times-grid">
            <div className="setting-field">
              <label htmlFor="edit-start-time" className="setting-label">
                Planned Start Time (optional)
              </label>
              <input
                id="edit-start-time"
                type="time"
                className="task-input time-input"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setErrorMessage(null);
                }}
                data-testid="edit-start-time-input"
              />
            </div>

            <div className="setting-field">
              <label htmlFor="edit-deadline" className="setting-label">
                Deadline (optional)
              </label>
              <input
                id="edit-deadline"
                type="time"
                className="task-input time-input"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  setErrorMessage(null);
                }}
                data-testid="edit-deadline-input"
              />
            </div>
          </div>

          <div className="setting-field">
            <label className="setting-label">Priority Level</label>
            <div className="priority-select-group" role="radiogroup" aria-label="Priority level">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={priority === level}
                  className={`priority-btn priority-btn-${level} ${priority === level ? 'active' : ''}`}
                  onClick={() => setPriority(level)}
                  data-testid={`edit-priority-${level}`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="planner-toggles-row">
            <label className="sound-toggle-label">
              <input
                type="checkbox"
                className="sound-checkbox"
                checked={isTodayPriority}
                onChange={(e) => setIsTodayPriority(e.target.checked)}
                data-testid="edit-today-priority-checkbox"
              />
              <span>★ Mark as Today&rsquo;s Top Priority</span>
            </label>

            <label className="sound-toggle-label">
              <input
                type="checkbox"
                className="sound-checkbox"
                checked={inProgress}
                onChange={(e) => setInProgress(e.target.checked)}
                data-testid="edit-in-progress-checkbox"
              />
              <span>In Progress</span>
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary modal-btn"
              onClick={onClose}
              data-testid="cancel-edit-task-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary modal-btn"
              data-testid="save-edit-task-button"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const EditPlannedTaskModal: React.FC<EditPlannedTaskModalProps> = ({
  task,
  onSave,
  onClose,
}) => {
  if (!task) return null;

  return (
    <EditPlannedTaskDialog
      task={task}
      onSave={onSave}
      onClose={onClose}
    />
  );
};
