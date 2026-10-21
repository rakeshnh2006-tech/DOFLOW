import React, { useState } from 'react';
import type { Task, UseTasksReturn } from '../types/task';
import { TaskItem } from './TaskItem';
import { DeleteTaskModal } from './DeleteTaskModal';

interface TaskManagerProps {
  taskState: UseTasksReturn;
}

export const TaskManager: React.FC<TaskManagerProps> = ({ taskState }) => {
  const {
    tasks,
    activeTaskId,
    errorMessage,
    addTask,
    toggleTask,
    deleteTask,
    selectActiveTask,
    clearError,
  } = taskState;

  const [inputTitle, setInputTitle] = useState('');
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = addTask(inputTitle);
    if (success) {
      setInputTitle('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputTitle(e.target.value);
    if (errorMessage) {
      clearError();
    }
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <section className="task-manager-section" aria-label="Task Management">
      <div className="task-manager-header">
        <div className="task-header-left">
          <h2 className="task-section-title">Focus Tasks</h2>
          {tasks.length > 0 && (
            <span className="task-counter" data-testid="task-counter">
              {completedCount} of {tasks.length} completed
            </span>
          )}
        </div>
      </div>

      {/* Add Task Form */}
      <form className="add-task-form" onSubmit={handleFormSubmit} noValidate>
        <div className="task-input-wrapper">
          <input
            type="text"
            className={`task-input ${errorMessage ? 'has-error' : ''}`}
            placeholder="What are you working on next?"
            value={inputTitle}
            onChange={handleInputChange}
            aria-label="New task name"
            aria-invalid={!!errorMessage}
            aria-describedby={errorMessage ? 'task-error-msg' : undefined}
            data-testid="task-input"
          />
          <button
            type="submit"
            className="btn btn-primary btn-add-task"
            data-testid="add-task-button"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Task</span>
          </button>
        </div>

        {errorMessage && (
          <p
            id="task-error-msg"
            className="task-error-message"
            role="alert"
            data-testid="task-error-message"
          >
            {errorMessage}
          </p>
        )}
      </form>

      {/* Task List or Empty State */}
      {tasks.length === 0 ? (
        <div className="tasks-empty-state" data-testid="tasks-empty-state">
          <div className="empty-icon-wrap" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <p className="empty-title">No tasks added yet</p>
          <p className="empty-desc">
            Add a task above to set an active goal for your focus session.
          </p>
        </div>
      ) : (
        <ul className="task-list" role="list" data-testid="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isActive={task.id === activeTaskId}
              onToggle={toggleTask}
              onSelect={selectActiveTask}
              onDeleteRequest={setTaskToDelete}
            />
          ))}
        </ul>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteTaskModal
        task={taskToDelete}
        onConfirm={() => {
          if (taskToDelete) {
            deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
        onCancel={() => setTaskToDelete(null)}
      />
    </section>
  );
};
