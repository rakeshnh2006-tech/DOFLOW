import React, { useEffect } from 'react';
import type { Task } from '../types/task';

interface DeleteTaskModalProps {
  task: Task | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteTaskModal: React.FC<DeleteTaskModalProps> = ({
  task,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!task) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [task, onCancel]);

  if (!task) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      data-testid="delete-task-modal"
    >
      <div
        className="modal-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-desc"
      >
        <div className="modal-header">
          <h3 id="delete-modal-title" className="modal-title">
            Delete Task?
          </h3>
        </div>

        <p id="delete-modal-desc" className="modal-body">
          Are you sure you want to delete &ldquo;{task.title}&rdquo;? This action cannot be undone.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary modal-btn"
            onClick={onCancel}
            data-testid="cancel-delete-button"
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary modal-btn modal-btn-danger"
            onClick={onConfirm}
            data-testid="confirm-delete-button"
          >
            Delete Task
          </button>
        </div>
      </div>
    </div>
  );
};
