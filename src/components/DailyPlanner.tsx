import React, { useMemo, useState } from 'react';
import type { PlannedTask, PlannerFilter, PlannerPriority } from '../types/planner';
import type { UsePlannerReturn } from '../hooks/usePlanner';
import { EditPlannedTaskModal } from './EditPlannedTaskModal';

interface DailyPlannerProps {
  plannerState: UsePlannerReturn;
  activeTaskId: string | null;
}

export const DailyPlanner: React.FC<DailyPlannerProps> = ({
  plannerState,
  activeTaskId,
}) => {
  const {
    displayTasks,
    filter,
    setFilter,
    summary,
    addPlannedTask,
    updatePlannedTask,
    deletePlannedTask,
    togglePlannedTaskCompletion,
    toggleTodayPriority,
    setAsFocusGoal,
    isTaskOverdue,
    isTaskUpcoming,
    unplannedExistingTasks,
  } = plannerState;

  // Form State
  const [creationMode, setCreationMode] = useState<'new' | 'existing'>('new');
  const [newTitle, setNewTitle] = useState('');
  const [selectedExistingId, setSelectedExistingId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<PlannerPriority>('medium');
  const [isTodayPriority, setIsTodayPriority] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Edit State
  const [editingTask, setEditingTask] = useState<PlannedTask | null>(null);

  // Local user's formatted date string e.g. "Tuesday, October 20, 2026"
  const formattedLocalDate = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (creationMode === 'existing') {
      if (!selectedExistingId) {
        setFormError('Please select an existing task to plan.');
        return;
      }
      const existingTask = unplannedExistingTasks.find((t) => t.id === selectedExistingId);
      if (!existingTask) {
        setFormError('Selected task not found.');
        return;
      }

      const result = addPlannedTask({
        id: selectedExistingId,
        title: existingTask.title,
        startTime: startTime || undefined,
        deadline: deadline || undefined,
        priority,
        isTodayPriority,
      });

      if (result.success) {
        setSelectedExistingId('');
        setStartTime('');
        setDeadline('');
        setPriority('medium');
        setIsTodayPriority(false);
        setFormError(null);
      } else {
        setFormError(result.error ?? 'Could not add task.');
      }
    } else {
      // New Task
      if (!newTitle.trim()) {
        setFormError('Please enter a task title.');
        return;
      }

      const result = addPlannedTask({
        title: newTitle.trim(),
        startTime: startTime || undefined,
        deadline: deadline || undefined,
        priority,
        isTodayPriority,
      });

      if (result.success) {
        setNewTitle('');
        setStartTime('');
        setDeadline('');
        setPriority('medium');
        setIsTodayPriority(false);
        setFormError(null);
      } else {
        setFormError(result.error ?? 'Could not add task.');
      }
    }
  };

  return (
    <div className="daily-planner-page" data-testid="daily-planner-page">
      {/* 1. Header with Local Timezone Date */}
      <section className="planner-header-section" aria-label="Planner Header">
        <div className="planner-header-content">
          <div className="planner-title-group">
            <h1 className="planner-title">Daily Planner</h1>
            <p className="planner-date" data-testid="planner-local-date">
              {formattedLocalDate}
            </p>
          </div>
          <span className="planner-badge" data-testid="planner-date-badge">
            Today
          </span>
        </div>

        {/* 2. Compact Daily Summary */}
        <div className="planner-summary-grid" role="group" aria-label="Daily summary">
          <div className="planner-summary-card" data-testid="planner-summary-total">
            <span className="summary-value" data-testid="planner-total-count">
              {summary.total}
            </span>
            <span className="summary-label">Planned</span>
          </div>

          <div className="planner-summary-card" data-testid="planner-summary-completed">
            <span className="summary-value text-success" data-testid="planner-completed-count">
              {summary.completed}
            </span>
            <span className="summary-label">Completed</span>
          </div>

          <div className="planner-summary-card" data-testid="planner-summary-remaining">
            <span className="summary-value text-accent" data-testid="planner-remaining-count">
              {summary.remaining}
            </span>
            <span className="summary-label">Remaining</span>
          </div>
        </div>
      </section>

      {/* 3. Add Planned Task Section */}
      <section className="planner-card planner-add-section" aria-label="Add Planned Task">
        <h2 className="planner-section-title">Schedule a Task</h2>

        {/* Source Switcher: New Task vs Pick Existing Task */}
        <div className="planner-source-tabs" role="tablist" aria-label="Task source">
          <button
            type="button"
            role="tab"
            aria-selected={creationMode === 'new'}
            className={`source-tab ${creationMode === 'new' ? 'active' : ''}`}
            onClick={() => {
              setCreationMode('new');
              setFormError(null);
            }}
            data-testid="planner-tab-new-task"
          >
            Create New Task
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={creationMode === 'existing'}
            className={`source-tab ${creationMode === 'existing' ? 'active' : ''}`}
            onClick={() => {
              setCreationMode('existing');
              setFormError(null);
            }}
            data-testid="planner-tab-existing-task"
          >
            Pick from Doflow Tasks ({unplannedExistingTasks.length})
          </button>
        </div>

        <form onSubmit={handleFormSubmit} noValidate>
          {formError && (
            <div className="settings-error-alert" role="alert" data-testid="planner-error-message">
              {formError}
            </div>
          )}

          {/* Task Name or Existing Task Select */}
          {creationMode === 'new' ? (
            <div className="setting-field">
              <label htmlFor="planner-task-title-input" className="setting-label">
                Task Description
              </label>
              <input
                id="planner-task-title-input"
                type="text"
                className="task-input"
                placeholder="What will you accomplish today?"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  setFormError(null);
                }}
                data-testid="planner-task-title-input"
              />
            </div>
          ) : (
            <div className="setting-field">
              <label htmlFor="planner-select-existing-task" className="setting-label">
                Select an Unplanned Task
              </label>
              {unplannedExistingTasks.length === 0 ? (
                <p className="no-existing-tasks-hint">
                  All current tasks are already planned or completed! You can switch to &ldquo;Create New Task&rdquo; above.
                </p>
              ) : (
                <select
                  id="planner-select-existing-task"
                  className="task-input select-input"
                  value={selectedExistingId}
                  onChange={(e) => {
                    setSelectedExistingId(e.target.value);
                    setFormError(null);
                  }}
                  data-testid="planner-select-existing-task"
                >
                  <option value="">-- Choose an existing task --</option>
                  {unplannedExistingTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Time Controls */}
          <div className="planner-times-grid">
            <div className="setting-field">
              <label htmlFor="planner-start-time-input" className="setting-label">
                Planned Start (optional)
              </label>
              <input
                id="planner-start-time-input"
                type="time"
                className="task-input time-input"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setFormError(null);
                }}
                data-testid="planner-start-time-input"
              />
            </div>

            <div className="setting-field">
              <label htmlFor="planner-deadline-input" className="setting-label">
                Deadline (optional)
              </label>
              <input
                id="planner-deadline-input"
                type="time"
                className="task-input time-input"
                value={deadline}
                onChange={(e) => {
                  setDeadline(e.target.value);
                  setFormError(null);
                }}
                data-testid="planner-deadline-input"
              />
            </div>
          </div>

          {/* Priority & Top Priority */}
          <div className="planner-priority-row">
            <div className="setting-field priority-field">
              <span className="setting-label">Priority Level</span>
              <div className="priority-select-group" role="radiogroup" aria-label="Task priority">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={priority === level}
                    className={`priority-btn priority-btn-${level} ${priority === level ? 'active' : ''}`}
                    onClick={() => setPriority(level)}
                    data-testid={`planner-priority-${level}`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <label className="sound-toggle-label priority-toggle-label">
              <input
                type="checkbox"
                className="sound-checkbox"
                checked={isTodayPriority}
                onChange={(e) => setIsTodayPriority(e.target.checked)}
                data-testid="planner-today-priority-checkbox"
              />
              <span>★ Mark as Today&rsquo;s Top Priority</span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-add-planned"
            data-testid="add-planned-task-button"
          >
            Add to Planner
          </button>
        </form>
      </section>

      {/* 4. Filters & Tasks List */}
      <section className="planner-tasks-section" aria-label="Today's Planned Tasks">
        <div className="planner-filters-bar">
          <div className="filter-buttons-group" role="tablist" aria-label="Task status filters">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'planned', label: 'Planned' },
                { id: 'in_progress', label: 'In Progress' },
                { id: 'completed', label: 'Completed' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={filter === tab.id}
                className={`filter-btn ${filter === tab.id ? 'active' : ''}`}
                onClick={() => setFilter(tab.id as PlannerFilter)}
                data-testid={`planner-filter-${tab.id.replace('_', '-')}`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* List of Planned Tasks or Empty State */}
        {displayTasks.length === 0 ? (
          <div className="tasks-empty-state planner-empty-state" data-testid="planner-empty-state">
            <div className="empty-icon-wrap" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="empty-title">
              {filter === 'all'
                ? 'No tasks planned for today'
                : `No ${filter.replace('_', ' ')} tasks`}
            </p>
            <p className="empty-desc">
              {filter === 'all'
                ? 'Plan your day by adding a new task or selecting from your existing Doflow tasks above.'
                : 'Try switching filters to view your other planned tasks.'}
            </p>
          </div>
        ) : (
          <ul className="planned-tasks-list" role="list" data-testid="planned-tasks-list">
            {displayTasks.map((task) => {
              const overdue = isTaskOverdue(task);
              const upcoming = isTaskUpcoming(task);
              const isFocusGoal = task.id === activeTaskId;

              return (
                <li
                  key={task.id}
                  className={`planned-task-card ${task.completed ? 'completed' : ''} ${
                    task.isTodayPriority ? 'is-today-priority' : ''
                  }`}
                  data-testid={`planned-task-card-${task.id}`}
                  data-priority={task.priority}
                >
                  {/* Top Priority Banner if set */}
                  {task.isTodayPriority && (
                    <div
                      className="today-priority-banner"
                      data-testid={`planner-top-priority-badge-${task.id}`}
                    >
                      <span aria-hidden="true">★</span> Today&rsquo;s Top Priority
                    </div>
                  )}

                  <div className="planned-card-main">
                    {/* Completion Checkbox */}
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={task.completed}
                      aria-label={
                        task.completed
                          ? `Mark "${task.title}" incomplete`
                          : `Mark "${task.title}" complete`
                      }
                      className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                      onClick={() => togglePlannedTaskCompletion(task.id)}
                      data-testid={`planner-task-checkbox-${task.id}`}
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

                    {/* Task Info & Time Details */}
                    <div className="planned-content-group">
                      <div className="planned-title-row">
                        <span
                          className={`planned-title ${task.completed ? 'title-completed' : ''}`}
                          data-testid={`planner-task-title-${task.id}`}
                        >
                          {task.title}
                        </span>
                      </div>

                      {/* Schedule info & badges */}
                      <div className="planned-badges-row">
                        {/* Time Badges */}
                        {task.startTime || task.deadline ? (
                          <span
                            className="time-badge"
                            data-testid={`planner-task-time-${task.id}`}
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="12"
                              height="12"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              aria-hidden="true"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>
                              {task.startTime && task.deadline
                                ? `${task.startTime} – ${task.deadline}`
                                : task.startTime
                                ? `Starts ${task.startTime}`
                                : `Due ${task.deadline}`}
                            </span>
                          </span>
                        ) : (
                          <span
                            className="time-badge time-badge-unscheduled"
                            data-testid={`planner-task-time-${task.id}`}
                          >
                            Unscheduled
                          </span>
                        )}

                        {/* Priority Badge */}
                        <span
                          className={`priority-pill priority-pill-${task.priority}`}
                          data-testid={`planner-priority-badge-${task.id}`}
                        >
                          {task.priority.toUpperCase()}
                        </span>

                        {/* Overdue Badge */}
                        {overdue && (
                          <span
                            className="status-pill status-pill-overdue"
                            data-testid={`planner-overdue-badge-${task.id}`}
                          >
                            Overdue
                          </span>
                        )}

                        {/* Upcoming Badge */}
                        {upcoming && (
                          <span
                            className="status-pill status-pill-upcoming"
                            data-testid={`planner-upcoming-badge-${task.id}`}
                          >
                            Upcoming
                          </span>
                        )}

                        {/* Focus Goal / In Progress Badge */}
                        {(isFocusGoal || task.inProgress) && !task.completed && (
                          <span
                            className="status-pill status-pill-progress"
                            data-testid={`planner-in-progress-badge-${task.id}`}
                          >
                            {isFocusGoal ? 'Active Focus' : 'In Progress'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="planned-card-actions">
                      {/* Set as Focus Goal */}
                      <button
                        type="button"
                        className={`btn-planner-action ${isFocusGoal ? 'active' : ''}`}
                        onClick={() => setAsFocusGoal(task.id)}
                        title={
                          isFocusGoal
                            ? 'Currently selected for Focus session'
                            : 'Set as active focus goal for Pomodoro timer'
                        }
                        aria-label={
                          isFocusGoal
                            ? `Deselect "${task.title}" as active focus`
                            : `Set "${task.title}" as active focus`
                        }
                        data-testid={`set-focus-goal-button-${task.id}`}
                      >
                        {isFocusGoal ? 'Focusing' : 'Focus'}
                      </button>

                      {/* Toggle Top Priority */}
                      <button
                        type="button"
                        className={`btn-planner-icon ${task.isTodayPriority ? 'active-star' : ''}`}
                        onClick={() => toggleTodayPriority(task.id)}
                        aria-label={
                          task.isTodayPriority
                            ? `Remove top priority from "${task.title}"`
                            : `Mark "${task.title}" as today's top priority`
                        }
                        title="Toggle today's top priority"
                        data-testid={`toggle-priority-button-${task.id}`}
                      >
                        ★
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        className="btn-planner-icon"
                        onClick={() => setEditingTask(task)}
                        aria-label={`Edit task "${task.title}"`}
                        title="Edit planned task"
                        data-testid={`edit-planned-task-button-${task.id}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        className="btn-planner-icon btn-planner-delete"
                        onClick={() => deletePlannedTask(task.id)}
                        aria-label={`Remove task "${task.title}" from planner`}
                        title="Remove from planner"
                        data-testid={`delete-planned-task-button-${task.id}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Edit Modal */}
      <EditPlannedTaskModal
        task={editingTask}
        onSave={updatePlannedTask}
        onClose={() => setEditingTask(null)}
      />
    </div>
  );
};
