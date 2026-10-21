import { TASKS_STORAGE_KEY, ACTIVE_TASK_STORAGE_KEY } from './taskStorage';
import { PLANNER_STORAGE_KEY } from './plannerStorage';
import { SESSION_HISTORY_STORAGE_KEY } from './statsStorage';
import { PREFERENCES_STORAGE_KEY } from './settingsStorage';
import { SOUNDSCAPE_STORAGE_KEY } from './soundscapeStorage';
import { HABITS_STORAGE_KEY, HABIT_COMPLETIONS_STORAGE_KEY } from './habitStorage';
import { DAILY_GOALS_STORAGE_KEY, ACHIEVEMENTS_STORAGE_KEY } from './goalsStorage';
import { SESSION_REFLECTIONS_STORAGE_KEY } from './reflectionStorage';

/**
 * All known storage keys used by the Doflow application in localStorage.
 */
export const DOFLOW_STORAGE_KEYS = [
  TASKS_STORAGE_KEY,
  ACTIVE_TASK_STORAGE_KEY,
  PLANNER_STORAGE_KEY,
  SESSION_HISTORY_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
  SOUNDSCAPE_STORAGE_KEY,
  HABITS_STORAGE_KEY,
  HABIT_COMPLETIONS_STORAGE_KEY,
  DAILY_GOALS_STORAGE_KEY,
  ACHIEVEMENTS_STORAGE_KEY,
  SESSION_REFLECTIONS_STORAGE_KEY,
] as const;

export interface StorageCategoryFootprint {
  key: string;
  label: string;
  hasData: boolean;
  itemCount: number;
}

export interface StoredDataSummary {
  totalDoflowKeys: number;
  activeKeysCount: number;
  categories: StorageCategoryFootprint[];
  estimatedSizeBytes: number;
}

/**
 * Inspects what Doflow data currently exists in the user's browser localStorage.
 */
export function inspectStoredDataFootprint(): StoredDataSummary {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      totalDoflowKeys: DOFLOW_STORAGE_KEYS.length,
      activeKeysCount: 0,
      categories: [],
      estimatedSizeBytes: 0,
    };
  }

  const categoryLabels: Record<string, string> = {
    [TASKS_STORAGE_KEY]: 'Task list entries',
    [ACTIVE_TASK_STORAGE_KEY]: 'Active focus task goal',
    [PLANNER_STORAGE_KEY]: 'Daily planner tasks',
    [SESSION_HISTORY_STORAGE_KEY]: 'Focus & break session history',
    [PREFERENCES_STORAGE_KEY]: 'Timer & theme preferences',
    [SOUNDSCAPE_STORAGE_KEY]: 'Soundscape audio preferences',
    [HABITS_STORAGE_KEY]: 'Habit definitions',
    [HABIT_COMPLETIONS_STORAGE_KEY]: 'Habit completion logs',
    [DAILY_GOALS_STORAGE_KEY]: 'Daily goals targets',
    [ACHIEVEMENTS_STORAGE_KEY]: 'Unlocked milestones',
    [SESSION_REFLECTIONS_STORAGE_KEY]: 'Post-session reflections',
  };

  let totalSize = 0;
  let activeCount = 0;
  const categories: StorageCategoryFootprint[] = [];

  for (const key of DOFLOW_STORAGE_KEYS) {
    const raw = window.localStorage.getItem(key);
    let count = 0;
    const hasData = raw !== null && raw.length > 0;

    if (hasData) {
      activeCount += 1;
      totalSize += (key.length + raw.length) * 2; // UTF-16 byte approximation
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          count = parsed.length;
        } else if (typeof parsed === 'object' && parsed !== null) {
          count = Object.keys(parsed).length;
        } else {
          count = 1;
        }
      } catch {
        count = 1;
      }
    }

    categories.push({
      key,
      label: categoryLabels[key] || key,
      hasData,
      itemCount: count,
    });
  }

  return {
    totalDoflowKeys: DOFLOW_STORAGE_KEYS.length,
    activeKeysCount: activeCount,
    categories,
    estimatedSizeBytes: totalSize,
  };
}

/**
 * Safely removes all Doflow storage keys from localStorage.
 * Does not remove unrelated keys from other applications on the same origin.
 */
export function clearAllDoflowData(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    for (const key of DOFLOW_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}
