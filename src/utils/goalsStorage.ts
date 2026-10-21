import type { DailyGoalsConfig, UnlockedAchievementRecord } from '../types/goals';

export const DAILY_GOALS_STORAGE_KEY = 'doflow_daily_goals_v1';
export const ACHIEVEMENTS_STORAGE_KEY = 'doflow_achievements_v1';

export const DEFAULT_DAILY_GOALS: DailyGoalsConfig = {
  targetFocusMinutes: 60,
  targetFocusSessions: 4,
  tasksGoalEnabled: true,
  targetCompletedTasks: 3,
};

function isValidGoalsConfig(obj: unknown): obj is DailyGoalsConfig {
  if (!obj || typeof obj !== 'object') return false;
  const c = obj as Record<string, unknown>;
  return (
    typeof c.targetFocusMinutes === 'number' &&
    Number.isInteger(c.targetFocusMinutes) &&
    c.targetFocusMinutes >= 1 &&
    c.targetFocusMinutes <= 720 &&
    typeof c.targetFocusSessions === 'number' &&
    Number.isInteger(c.targetFocusSessions) &&
    c.targetFocusSessions >= 1 &&
    c.targetFocusSessions <= 48 &&
    typeof c.tasksGoalEnabled === 'boolean' &&
    typeof c.targetCompletedTasks === 'number' &&
    Number.isInteger(c.targetCompletedTasks) &&
    c.targetCompletedTasks >= 1 &&
    c.targetCompletedTasks <= 50
  );
}

/**
 * Safely loads daily goals preferences from localStorage.
 */
export function loadDailyGoalsFromStorage(): DailyGoalsConfig {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_DAILY_GOALS };
    }

    const raw = window.localStorage.getItem(DAILY_GOALS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_DAILY_GOALS };

    const parsed = JSON.parse(raw);
    if (isValidGoalsConfig(parsed)) {
      return parsed;
    }

    return { ...DEFAULT_DAILY_GOALS };
  } catch {
    return { ...DEFAULT_DAILY_GOALS };
  }
}

/**
 * Safely saves daily goals preferences to localStorage.
 */
export function saveDailyGoalsToStorage(config: DailyGoalsConfig): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(DAILY_GOALS_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Fail safely if quota exceeded
  }
}

/**
 * Safely loads unlocked achievement records from localStorage.
 */
export function loadUnlockedAchievementsFromStorage(): Record<string, number> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return {};
    }

    const raw = window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return {};

    const records: Record<string, number> = {};
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.unlockedAt === 'number'
      ) {
        records[item.id] = item.unlockedAt;
      }
    }

    return records;
  } catch {
    return {};
  }
}

/**
 * Safely saves unlocked achievement records to localStorage.
 */
export function saveUnlockedAchievementsToStorage(
  unlockedMap: Record<string, number>
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const list: UnlockedAchievementRecord[] = Object.entries(unlockedMap).map(
      ([id, unlockedAt]) => ({
        id,
        unlockedAt,
      })
    );

    window.localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Fail safely if quota exceeded
  }
}
