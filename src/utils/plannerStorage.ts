import type { PlannedTask, PlannerPriority } from '../types/planner';

export const PLANNER_STORAGE_KEY = 'doflow_planner_tasks_v1';

/**
 * Validates HH:mm time string (from 00:00 to 23:59).
 */
export function isValidTimeFormat(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  if (!val.trim()) return false;
  const match = val.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return match !== null;
}

/**
 * Validates whether an unknown value conforms to PlannedTask.
 */
function isValidPlannedTask(item: unknown): item is PlannedTask {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const candidate = item as Record<string, unknown>;

  const hasValidId = typeof candidate.id === 'string' && candidate.id.length > 0;
  const hasValidTitle = typeof candidate.title === 'string' && candidate.title.length > 0;
  const hasValidCompleted = typeof candidate.completed === 'boolean';
  const hasValidDate = typeof candidate.date === 'string' && candidate.date.length === 10;
  const hasValidPriority =
    candidate.priority === 'low' ||
    candidate.priority === 'medium' ||
    candidate.priority === 'high';

  if (!hasValidId || !hasValidTitle || !hasValidCompleted || !hasValidDate || !hasValidPriority) {
    return false;
  }

  // Validate optional start time if provided
  if (
    candidate.startTime !== undefined &&
    candidate.startTime !== '' &&
    !isValidTimeFormat(candidate.startTime)
  ) {
    return false;
  }

  // Validate optional deadline if provided
  if (
    candidate.deadline !== undefined &&
    candidate.deadline !== '' &&
    !isValidTimeFormat(candidate.deadline)
  ) {
    return false;
  }

  return true;
}

/**
 * Safely loads planned tasks from localStorage, returning an empty array on any failure or malformed data.
 */
export function loadPlannedTasksFromStorage(): PlannedTask[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    const raw = window.localStorage.getItem(PLANNER_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Filter to only valid planned task items
    return parsed.filter(isValidPlannedTask).map((item) => ({
      ...item,
      priority: (item.priority as PlannerPriority) || 'medium',
      startTime: item.startTime || undefined,
      deadline: item.deadline || undefined,
      inProgress: Boolean(item.inProgress),
      isTodayPriority: Boolean(item.isTodayPriority),
    }));
  } catch {
    return [];
  }
}

/**
 * Safely saves planned tasks to localStorage. Handles QuotaExceeded and storage access errors.
 */
export function savePlannedTasksToStorage(tasks: PlannedTask[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Fail safely if storage quota is exceeded or unavailable
  }
}
