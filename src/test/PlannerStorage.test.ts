import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isValidTimeFormat,
  loadPlannedTasksFromStorage,
  savePlannedTasksToStorage,
  PLANNER_STORAGE_KEY,
} from '../utils/plannerStorage';
import type { PlannedTask } from '../types/planner';

describe('PlannerStorage Utility & Validation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('isValidTimeFormat', () => {
    it('accepts valid 24-hour HH:mm time strings', () => {
      expect(isValidTimeFormat('00:00')).toBe(true);
      expect(isValidTimeFormat('09:30')).toBe(true);
      expect(isValidTimeFormat('12:00')).toBe(true);
      expect(isValidTimeFormat('23:59')).toBe(true);
    });

    it('rejects invalid time formats and out-of-range values', () => {
      expect(isValidTimeFormat('')).toBe(false);
      expect(isValidTimeFormat('   ')).toBe(false);
      expect(isValidTimeFormat('9:30')).toBe(false); // missing leading zero
      expect(isValidTimeFormat('24:00')).toBe(false); // hour 24
      expect(isValidTimeFormat('12:60')).toBe(false); // minute 60
      expect(isValidTimeFormat('-01:00')).toBe(false);
      expect(isValidTimeFormat('morning')).toBe(false);
      expect(isValidTimeFormat(null)).toBe(false);
      expect(isValidTimeFormat(undefined)).toBe(false);
    });
  });

  describe('loadPlannedTasksFromStorage & savePlannedTasksToStorage', () => {
    it('returns empty array when storage is empty', () => {
      expect(loadPlannedTasksFromStorage()).toEqual([]);
    });

    it('saves and loads valid planned tasks accurately', () => {
      const sampleTasks: PlannedTask[] = [
        {
          id: 'task-1',
          title: 'Review System Architecture',
          completed: false,
          createdAt: 1000,
          date: '2026-10-20',
          startTime: '09:00',
          deadline: '11:00',
          priority: 'high',
          inProgress: true,
          isTodayPriority: true,
        },
        {
          id: 'task-2',
          title: 'Team Sync Meeting',
          completed: true,
          createdAt: 2000,
          date: '2026-10-20',
          startTime: '14:00',
          priority: 'medium',
          inProgress: false,
          isTodayPriority: false,
        },
      ];

      savePlannedTasksToStorage(sampleTasks);
      const loaded = loadPlannedTasksFromStorage();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].title).toBe('Review System Architecture');
      expect(loaded[0].priority).toBe('high');
      expect(loaded[0].isTodayPriority).toBe(true);
      expect(loaded[1].completed).toBe(true);
    });

    it('safely recovers from malformed or corrupted JSON in localStorage', () => {
      window.localStorage.setItem(PLANNER_STORAGE_KEY, '{invalid-json---');
      expect(loadPlannedTasksFromStorage()).toEqual([]);

      window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify('not-an-array'));
      expect(loadPlannedTasksFromStorage()).toEqual([]);
    });

    it('filters out corrupted items from a partially valid array', () => {
      const mixedData = [
        {
          id: 'valid-task-1',
          title: 'Valid Planned Task',
          completed: false,
          createdAt: 1000,
          date: '2026-10-20',
          priority: 'low',
        },
        { id: '', title: 'Missing id', completed: false, date: '2026-10-20', priority: 'low' },
        { id: 'bad-priority', title: 'Bad priority', completed: false, date: '2026-10-20', priority: 'urgent' },
        { id: 'bad-date', title: 'Bad date', completed: false, date: 'today', priority: 'medium' },
        { id: 'bad-time', title: 'Bad time', completed: false, date: '2026-10-20', startTime: '99:99', priority: 'high' },
        null,
        1234,
      ];

      window.localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(mixedData));
      const loaded = loadPlannedTasksFromStorage();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('valid-task-1');
    });

    it('handles localStorage QuotaExceededError safely without throwing', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => {
        savePlannedTasksToStorage([
          {
            id: 'task-1',
            title: 'Sample Task',
            completed: false,
            createdAt: 1000,
            date: '2026-10-20',
            priority: 'medium',
          },
        ]);
      }).not.toThrow();
    });
  });
});
