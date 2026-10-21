import type { Habit, HabitCompletion } from '../types/habit';

export const HABITS_STORAGE_KEY = 'doflow_habits_v1';
export const HABIT_COMPLETIONS_STORAGE_KEY = 'doflow_habit_completions_v1';

function isValidHabit(item: unknown): item is Habit {
  if (!item || typeof item !== 'object') return false;
  const c = item as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.name === 'string' &&
    c.name.trim().length > 0 &&
    (c.frequency === 'daily' || c.frequency === 'weekdays' || c.frequency === 'custom') &&
    typeof c.createdAt === 'number' &&
    typeof c.archived === 'boolean'
  );
}

function isValidCompletion(item: unknown): item is HabitCompletion {
  if (!item || typeof item !== 'object') return false;
  const c = item as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    c.id.length > 0 &&
    typeof c.habitId === 'string' &&
    c.habitId.length > 0 &&
    typeof c.date === 'string' &&
    c.date.length === 10 &&
    typeof c.completedAt === 'number'
  );
}

/**
 * Safely loads habits from localStorage, filtering invalid records.
 */
export function loadHabitsFromStorage(): Habit[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    const raw = window.localStorage.getItem(HABITS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidHabit);
  } catch {
    return [];
  }
}

/**
 * Safely saves habits to localStorage.
 */
export function saveHabitsToStorage(habits: Habit[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
  } catch {
    // Fail safely if quota exceeded
  }
}

/**
 * Safely loads habit completions from localStorage, deduplicating by habitId and date.
 */
export function loadHabitCompletionsFromStorage(): HabitCompletion[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    const raw = window.localStorage.getItem(HABIT_COMPLETIONS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seen = new Set<string>();
    const deduplicated: HabitCompletion[] = [];

    for (const item of parsed) {
      if (isValidCompletion(item)) {
        const key = `${item.habitId}_${item.date}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(item);
        }
      }
    }

    return deduplicated;
  } catch {
    return [];
  }
}

/**
 * Safely saves habit completions to localStorage, guaranteeing no duplicate habitId + date records.
 */
export function saveHabitCompletionsToStorage(completions: HabitCompletion[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    // Deduplicate before saving
    const seen = new Set<string>();
    const deduplicated: HabitCompletion[] = [];

    for (const item of completions) {
      if (isValidCompletion(item)) {
        const key = `${item.habitId}_${item.date}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(item);
        }
      }
    }

    window.localStorage.setItem(
      HABIT_COMPLETIONS_STORAGE_KEY,
      JSON.stringify(deduplicated)
    );
  } catch {
    // Fail safely if quota exceeded
  }
}

export const loadCompletionsFromStorage = loadHabitCompletionsFromStorage;
export const saveCompletionsToStorage = saveHabitCompletionsToStorage;

/**
 * Toggles a completion record for a given habit and date in memory.
 */
export function toggleCompletionInRecords(
  records: HabitCompletion[],
  habitId: string,
  date: string
): HabitCompletion[] {
  const existingIndex = records.findIndex(
    (c) => c.habitId === habitId && c.date === date
  );
  if (existingIndex >= 0) {
    return records.filter((_, idx) => idx !== existingIndex);
  } else {
    const newCompletion: HabitCompletion = {
      id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      habitId,
      date,
      completedAt: Date.now(),
    };
    return [...records, newCompletion];
  }
}

