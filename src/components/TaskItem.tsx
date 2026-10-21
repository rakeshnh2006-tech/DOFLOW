import React from 'react';
import type { Task } from '../types/task';

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onDeleteRequest: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  isActive,
  onToggle,
  onSelect,
  onDeleteRequest,
}) => {
  return (
    <li
      className={`task-item ${task.completed ? 'completed' : ''} ${isActive ? 'active-focus-task' : ''}`}
      data-testid={`task-item-${task.id}`}
      data-active={isActive}
    >
      <div className="task-left">
        {/* Checkbox for completion */}
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
          className={`task-checkbox ${task.completed ? 'checked' : ''}`}
          onClick={() => onToggle(task.id)}
          data-testid={`task-checkbox-${task.id}`}
        >
          {task.completed && (
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Task Title & Active Badge */}
        <div className="task-content">
          <span
            className="task-title"
            data-testid={`task-title-${task.id}`}
            onClick={() => onSelect(task.id)}
            title="Click to toggle active focus for this task"
          >
            {task.title}
          </span>
          {isActive && (
            <span
              className="active-task-badge"
              data-testid="active-task-badge"
            >
              Current Focus
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        {/* Select for Focus Button */}
        <button
          type="button"
          className={`btn-select-focus ${isActive ? 'selected' : ''}`}
          onClick={() => onSelect(task.id)}
          aria-label={isActive ? `Deselect "${task.title}" as active focus` : `Set "${task.title}" as active focus`}
          data-testid={`select-task-button-${task.id}`}
        >
          {isActive ? 'Selected' : 'Focus'}
        </button>

        {/* Delete Task Button */}
        <button
          type="button"
          className="btn-delete-task"
          onClick={() => onDeleteRequest(task)}
          aria-label={`Delete task "${task.title}"`}
          data-testid={`delete-task-button-${task.id}`}
        >
          <svg
            viewBox="0 0 24 24"
            width="15"
            height="15"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </li>
  );
};
