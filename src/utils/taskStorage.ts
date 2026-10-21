import type { Task } from '../types/task';

export const TASKS_STORAGE_KEY = 'doflow_tasks_v1';
export const ACTIVE_TASK_STORAGE_KEY = 'doflow_active_task_id_v1';

/**
 * Validates whether an unknown value conforms to the Task structure.
 */
function isValidTask(item: unknown): item is Task {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    typeof candidate.completed === 'boolean'
  );
}

/**
 * Safely loads tasks from localStorage, returning an empty array on any failure or malformed data.
 */
export function loadTasksFromStorage(): Task[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Filter to only valid task objects to handle partially corrupted arrays
    return parsed.filter(isValidTask);
  } catch {
    // Gracefully recover from JSON syntax errors, storage restrictions, etc.
    return [];
  }
}

/**
 * Safely saves tasks to localStorage. Handles QuotaExceeded and storage access errors.
 */
export function saveTasksToStorage(tasks: Task[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // Fail safely if quota is exceeded or storage unavailable
  }
}

/**
 * Safely loads the active task ID from localStorage.
 */
export function loadActiveTaskId(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    const val = window.localStorage.getItem(ACTIVE_TASK_STORAGE_KEY);
    return val ? val : null;
  } catch {
    return null;
  }
}

/**
 * Safely saves the active task ID to localStorage.
 */
export function saveActiveTaskId(id: string | null): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    if (id) {
      window.localStorage.setItem(ACTIVE_TASK_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_TASK_STORAGE_KEY);
    }
  } catch {
    // Fail safely if storage write fails
  }
}
