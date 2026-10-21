import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadHabitsFromStorage,
  saveHabitsToStorage,
  loadCompletionsFromStorage,
  saveCompletionsToStorage,
  toggleCompletionInRecords,
  HABITS_STORAGE_KEY,
  HABIT_COMPLETIONS_STORAGE_KEY,
} from '../utils/habitStorage';
import type { Habit, HabitCompletion } from '../types/habit';

describe('HabitStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleHabit: Habit = {
    id: 'habit-test-1',
    name: 'Drink 2L Water',
    description: 'Keep hydrated throughout the workday',
    frequency: 'daily',
    createdAt: 1729400000000,
    archived: false,
  };

  const sampleCompletion: HabitCompletion = {
    id: 'comp-1',
    habitId: 'habit-test-1',
    date: '2026-10-20',
    completedAt: 1729410000000,
  };

  describe('Habits Persistence', () => {
    it('returns empty array when storage is empty', () => {
      const habits = loadHabitsFromStorage();
      expect(habits).toEqual([]);
    });

    it('saves and loads habits correctly', () => {
      saveHabitsToStorage([sampleHabit]);
      const loaded = loadHabitsFromStorage();
      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toEqual(sampleHabit);
    });

    it('handles malformed JSON gracefully by returning empty array', () => {
      localStorage.setItem(HABITS_STORAGE_KEY, 'invalid{json-corrupted');
      const loaded = loadHabitsFromStorage();
      expect(loaded).toEqual([]);
    });

    it('filters out invalid habit records lacking id or name', () => {
      const invalidData = [
        sampleHabit,
        { id: 'broken-1' }, // Missing name
        { name: 'Broken 2' }, // Missing id
        null,
        'string-instead-of-object',
      ];
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(invalidData));
      const loaded = loadHabitsFromStorage();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(sampleHabit.id);
    });
  });

  describe('Completions Persistence & Deduplication', () => {
    it('returns empty array when completions storage is empty', () => {
      const completions = loadCompletionsFromStorage();
      expect(completions).toEqual([]);
    });

    it('saves and loads completion records correctly', () => {
      saveCompletionsToStorage([sampleCompletion]);
      const loaded = loadCompletionsFromStorage();
      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toEqual(sampleCompletion);
    });

    it('handles malformed JSON in completions storage gracefully', () => {
      localStorage.setItem(HABIT_COMPLETIONS_STORAGE_KEY, '{corrupted-data[');
      const loaded = loadCompletionsFromStorage();
      expect(loaded).toEqual([]);
    });

    it('filters out malformed completion entries', () => {
      const invalidData = [
        sampleCompletion,
        { id: 'bad-1', habitId: 'h-1' }, // Missing date
        { habitId: 'h-2', date: '2026-10-20' }, // Missing id
      ];
      localStorage.setItem(HABIT_COMPLETIONS_STORAGE_KEY, JSON.stringify(invalidData));
      const loaded = loadCompletionsFromStorage();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(sampleCompletion.id);
    });

    it('deduplicates completions when saving records with identical habitId and date', () => {
      const duplicateCompletions: HabitCompletion[] = [
        sampleCompletion,
        {
          id: 'comp-duplicate',
          habitId: 'habit-test-1',
          date: '2026-10-20',
          completedAt: 1729420000000,
        },
      ];

      saveCompletionsToStorage(duplicateCompletions);
      const loaded = loadCompletionsFromStorage();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].date).toBe('2026-10-20');
    });

    it('toggles completion on and off without duplication', () => {
      // Initially empty
      let records: HabitCompletion[] = [];

      // 1. Mark complete
      records = toggleCompletionInRecords(records, 'habit-test-1', '2026-10-20');
      expect(records).toHaveLength(1);
      expect(records[0].habitId).toBe('habit-test-1');
      expect(records[0].date).toBe('2026-10-20');

      // 2. Undo completion
      records = toggleCompletionInRecords(records, 'habit-test-1', '2026-10-20');
      expect(records).toHaveLength(0);

      // 3. Mark complete again
      records = toggleCompletionInRecords(records, 'habit-test-1', '2026-10-20');
      expect(records).toHaveLength(1);
    });
  });
});
