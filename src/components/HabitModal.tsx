import React, { useEffect, useState } from 'react';
import type { Habit, HabitFrequency, HabitInput } from '../types/habit';

interface HabitModalProps {
  isOpen: boolean;
  habitToEdit?: Habit | null;
  onSave: (input: HabitInput) => boolean;
  onClose: () => void;
}

const WEEKDAYS_MAP = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

interface HabitFormContentProps {
  habitToEdit?: Habit | null;
  onSave: (input: HabitInput) => boolean;
  onClose: () => void;
}

const HabitFormContent: React.FC<HabitFormContentProps> = ({
  habitToEdit,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState<string>(habitToEdit?.name ?? '');
  const [description, setDescription] = useState<string>(habitToEdit?.description ?? '');
  const [frequency, setFrequency] = useState<HabitFrequency>(habitToEdit?.frequency ?? 'daily');
  const [customDays, setCustomDays] = useState<number[]>(
    habitToEdit?.customDays ?? [1, 2, 3, 4, 5]
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleToggleCustomDay = (dayNum: number) => {
    setCustomDays((prev) => {
      if (prev.includes(dayNum)) {
        return prev.filter((d) => d !== dayNum);
      }
      return [...prev, dayNum];
    });
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationError('Please enter a habit name.');
      return;
    }

    if (frequency === 'custom' && customDays.length === 0) {
      setValidationError('Please select at least one day of the week for custom schedule.');
      return;
    }

    const success = onSave({
      name: trimmed,
      description: description.trim() || undefined,
      frequency,
      customDays: frequency === 'custom' ? customDays : undefined,
    });

    if (success) {
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {validationError && (
        <div
          className="alert-banner alert-banner-danger"
          role="alert"
          data-testid="habit-validation-error"
        >
          {validationError}
        </div>
      )}

      {/* Habit Name Field */}
      <div className="setting-field">
        <label htmlFor="habit-name-input" className="setting-label">
          Habit Name *
        </label>
        <input
          id="habit-name-input"
          type="text"
          className="task-input"
          placeholder="e.g. Read 20 pages, Morning Run, Meditate"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setValidationError(null);
          }}
          autoFocus
          data-testid="habit-name-input"
        />
      </div>

      {/* Description Field */}
      <div className="setting-field">
        <label htmlFor="habit-desc-input" className="setting-label">
          Description (optional)
        </label>
        <input
          id="habit-desc-input"
          type="text"
          className="task-input"
          placeholder="e.g. Non-fiction books before sleep"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          data-testid="habit-desc-input"
        />
      </div>

      {/* Schedule / Frequency Selection */}
      <div className="setting-field">
        <label className="setting-label">Schedule</label>
        <div className="frequency-selector-group" role="radiogroup" aria-label="Habit frequency">
          <button
            type="button"
            role="radio"
            aria-checked={frequency === 'daily'}
            className={`freq-btn ${frequency === 'daily' ? 'active' : ''}`}
            onClick={() => setFrequency('daily')}
            data-testid="habit-freq-daily"
          >
            Daily
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={frequency === 'weekdays'}
            className={`freq-btn ${frequency === 'weekdays' ? 'active' : ''}`}
            onClick={() => setFrequency('weekdays')}
            data-testid="habit-freq-weekdays"
          >
            Weekdays (Mon–Fri)
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={frequency === 'custom'}
            className={`freq-btn ${frequency === 'custom' ? 'active' : ''}`}
            onClick={() => setFrequency('custom')}
            data-testid="habit-freq-custom"
          >
            Custom Days
          </button>
        </div>
      </div>

      {/* Custom Days Checkbox Row */}
      {frequency === 'custom' && (
        <div className="custom-days-group" data-testid="habit-custom-days-picker">
          <label className="setting-label">Select Active Days</label>
          <div className="custom-days-buttons" role="group" aria-label="Select custom weekdays">
            {WEEKDAYS_MAP.map((item) => {
              const isChecked = customDays.includes(item.day);
              return (
                <button
                  key={item.day}
                  type="button"
                  aria-pressed={isChecked}
                  className={`day-toggle-btn ${isChecked ? 'active' : ''}`}
                  onClick={() => handleToggleCustomDay(item.day)}
                  data-testid={`habit-day-toggle-${item.day}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Actions */}
      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-secondary modal-btn"
          onClick={onClose}
          data-testid="habit-modal-cancel-btn"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary modal-btn"
          data-testid="habit-modal-submit-btn"
        >
          {habitToEdit ? 'Save Changes' : 'Create Habit'}
        </button>
      </div>
    </form>
  );
};

export const HabitModal: React.FC<HabitModalProps> = ({
  isOpen,
  habitToEdit,
  onSave,
  onClose,
}) => {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      data-testid="habit-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card habit-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="habit-modal-title"
        data-testid="habit-modal"
      >
        <div className="modal-header">
          <h3 id="habit-modal-title" className="modal-title">
            {habitToEdit ? 'Edit Habit' : 'Create New Habit'}
          </h3>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
            data-testid="habit-modal-close-btn"
          >
            ✕
          </button>
        </div>

        <HabitFormContent
          key={habitToEdit ? habitToEdit.id : 'new'}
          habitToEdit={habitToEdit}
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
