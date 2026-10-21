import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadDailyGoalsFromStorage,
  saveDailyGoalsToStorage,
  loadUnlockedAchievementsFromStorage,
  saveUnlockedAchievementsToStorage,
  DEFAULT_DAILY_GOALS,
  DAILY_GOALS_STORAGE_KEY,
  ACHIEVEMENTS_STORAGE_KEY,
} from '../utils/goalsStorage';
import type { DailyGoalsConfig } from '../types/goals';

describe('GoalsStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Daily Goals Persistence', () => {
    it('returns default daily goals when storage is empty', () => {
      const goals = loadDailyGoalsFromStorage();
      expect(goals).toEqual(DEFAULT_DAILY_GOALS);
    });

    it('saves and reloads valid daily goals configuration', () => {
      const customGoals: DailyGoalsConfig = {
        targetFocusMinutes: 90,
        targetFocusSessions: 6,
        tasksGoalEnabled: true,
        targetCompletedTasks: 5,
      };

      saveDailyGoalsToStorage(customGoals);
      const loaded = loadDailyGoalsFromStorage();
      expect(loaded).toEqual(customGoals);
    });

    it('falls back to defaults if stored JSON is corrupted', () => {
      localStorage.setItem(DAILY_GOALS_STORAGE_KEY, '{invalid-json:!');
      const loaded = loadDailyGoalsFromStorage();
      expect(loaded).toEqual(DEFAULT_DAILY_GOALS);
    });

    it('falls back to defaults if values are outside valid ranges or malformed', () => {
      const invalidData = {
        targetFocusMinutes: -10, // Invalid negative
        targetFocusSessions: 'four', // Invalid string
      };
      localStorage.setItem(DAILY_GOALS_STORAGE_KEY, JSON.stringify(invalidData));
      const loaded = loadDailyGoalsFromStorage();
      expect(loaded).toEqual(DEFAULT_DAILY_GOALS);
    });
  });

  describe('Unlocked Achievements Persistence', () => {
    it('returns empty record map when storage is empty', () => {
      const unlocked = loadUnlockedAchievementsFromStorage();
      expect(unlocked).toEqual({});
    });

    it('saves and loads unlocked achievement timestamps correctly', () => {
      const records = {
        first_focus_session: 1729400000000,
        first_task_completed: 1729410000000,
      };

      saveUnlockedAchievementsToStorage(records);
      const loaded = loadUnlockedAchievementsFromStorage();
      expect(loaded).toEqual(records);
    });

    it('handles malformed JSON in achievements storage gracefully', () => {
      localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, 'invalid[json');
      const loaded = loadUnlockedAchievementsFromStorage();
      expect(loaded).toEqual({});
    });

    it('filters out invalid achievement records lacking valid id or timestamp', () => {
      const invalidList = [
        { id: 'first_step', unlockedAt: 1729400000000 },
        { id: 123, unlockedAt: 1729400000000 }, // Invalid id type
        { id: 'broken' }, // Missing timestamp
        null,
      ];
      localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(invalidList));
      const loaded = loadUnlockedAchievementsFromStorage();
      expect(loaded).toEqual({ first_step: 1729400000000 });
    });
  });
});
