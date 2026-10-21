import { describe, expect, it } from 'vitest';
import {
  calculateWeeklyMetrics,
  formatDateRange,
  getDaysInRange,
  getMondayOfWeek,
  getWeekRange,
  parseLocalDateString,
} from '../utils/analyticsUtils';
import type { CompletedSessionRecord } from '../types/stats';
import type { Task } from '../types/task';

describe('Feature 7: AnalyticsUtils Unit Tests', () => {
  describe('getMondayOfWeek', () => {
    it('returns Monday for a Wednesday reference date', () => {
      // 2026-10-21 is Wednesday
      const wednesday = new Date(2026, 9, 21);
      const monday = getMondayOfWeek(wednesday);
      expect(monday.getFullYear()).toBe(2026);
      expect(monday.getMonth()).toBe(9); // October
      expect(monday.getDate()).toBe(19); // Oct 19 is Monday
      expect(monday.getDay()).toBe(1);
    });

    it('returns the same day if reference date is already Monday', () => {
      const mondayRef = new Date(2026, 9, 19);
      const monday = getMondayOfWeek(mondayRef);
      expect(monday.getDate()).toBe(19);
      expect(monday.getDay()).toBe(1);
    });

    it('returns the preceding Monday if reference date is Sunday', () => {
      // 2026-10-25 is Sunday
      const sunday = new Date(2026, 9, 25);
      const monday = getMondayOfWeek(sunday);
      expect(monday.getDate()).toBe(19);
      expect(monday.getDay()).toBe(1);
    });

    it('handles month transition boundaries', () => {
      // 2026-11-01 is Sunday. Preceding Monday is Oct 26
      const sundayNov1 = new Date(2026, 10, 1);
      const monday = getMondayOfWeek(sundayNov1);
      expect(monday.getMonth()).toBe(9); // October
      expect(monday.getDate()).toBe(26);
    });
  });

  describe('getWeekRange', () => {
    it('returns 7 consecutive days starting on Monday and ending on Sunday', () => {
      const ref = new Date(2026, 9, 20); // Tuesday
      const range = getWeekRange(ref, 0);

      expect(range.days).toHaveLength(7);
      expect(range.startDate).toBe('2026-10-19'); // Mon
      expect(range.endDate).toBe('2026-10-25'); // Sun
      expect(range.days[0]).toBe('2026-10-19');
      expect(range.days[6]).toBe('2026-10-25');
    });

    it('returns the previous week when offset is -1', () => {
      const ref = new Date(2026, 9, 20);
      const lastWeek = getWeekRange(ref, -1);

      expect(lastWeek.days).toHaveLength(7);
      expect(lastWeek.startDate).toBe('2026-10-12');
      expect(lastWeek.endDate).toBe('2026-10-18');
    });
  });

  describe('getDaysInRange', () => {
    it('returns array of dates for a custom range', () => {
      const days = getDaysInRange('2026-10-10', '2026-10-14');
      expect(days).toEqual([
        '2026-10-10',
        '2026-10-11',
        '2026-10-12',
        '2026-10-13',
        '2026-10-14',
      ]);
    });

    it('swaps reversed start and end dates gracefully', () => {
      const days = getDaysInRange('2026-10-14', '2026-10-12');
      expect(days).toEqual(['2026-10-12', '2026-10-13', '2026-10-14']);
    });

    it('returns single date if start and end are identical', () => {
      const days = getDaysInRange('2026-10-20', '2026-10-20');
      expect(days).toEqual(['2026-10-20']);
    });
  });

  describe('formatDateRange', () => {
    it('formats a date range within the same month', () => {
      const formatted = formatDateRange('2026-10-19', '2026-10-25');
      expect(formatted).toBe('Oct 19 – 25, 2026');
    });

    it('formats a single date', () => {
      const formatted = formatDateRange('2026-10-20', '2026-10-20');
      expect(formatted).toBe('Oct 20, 2026');
    });

    it('formats a date range across month boundaries', () => {
      const formatted = formatDateRange('2026-10-26', '2026-11-01');
      expect(formatted).toBe('Oct 26 – Nov 1, 2026');
    });
  });

  describe('parseLocalDateString', () => {
    it('parses valid YYYY-MM-DD into a local Date', () => {
      const d = parseLocalDateString('2026-10-20');
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(2026);
      expect(d!.getMonth()).toBe(9);
      expect(d!.getDate()).toBe(20);
    });

    it('returns null on malformed date string', () => {
      expect(parseLocalDateString('invalid')).toBeNull();
      expect(parseLocalDateString('')).toBeNull();
    });
  });

  describe('calculateWeeklyMetrics', () => {
    const days = [
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ];

    it('returns zero totals and null mostProductiveDay on empty history', () => {
      const result = calculateWeeklyMetrics({
        days,
        sessionHistory: [],
        tasks: [],
      });

      expect(result.totalFocusMinutes).toBe(0);
      expect(result.totalFocusSessions).toBe(0);
      expect(result.totalCompletedTasks).toBe(0);
      expect(result.averageFocusMinutesPerDay).toBe(0);
      expect(result.mostProductiveDay).toBeNull();
      expect(result.hasActivity).toBe(false);
      expect(result.days).toHaveLength(7);
      expect(result.days[0].focusMinutes).toBe(0);
    });

    it('calculates totals from genuine focus sessions and strictly excludes short and long breaks', () => {
      const sessionHistory: CompletedSessionRecord[] = [
        // Focus session on Oct 19: 25 min
        {
          id: 's-1',
          mode: 'focus',
          durationMs: 25 * 60 * 1000,
          completedAt: 1000,
          localDate: '2026-10-19',
        },
        // Break session on Oct 19: 5 min (MUST BE EXCLUDED)
        {
          id: 's-2',
          mode: 'shortBreak',
          durationMs: 5 * 60 * 1000,
          completedAt: 2000,
          localDate: '2026-10-19',
        },
        // Focus session on Oct 20: 50 min
        {
          id: 's-3',
          mode: 'focus',
          durationMs: 50 * 60 * 1000,
          completedAt: 3000,
          localDate: '2026-10-20',
        },
        // Long break on Oct 20: 15 min (MUST BE EXCLUDED)
        {
          id: 's-4',
          mode: 'longBreak',
          durationMs: 15 * 60 * 1000,
          completedAt: 4000,
          localDate: '2026-10-20',
        },
      ];

      const tasks: Task[] = [
        {
          id: 't-1',
          title: 'Design API',
          completed: true,
          createdAt: 1000,
          completedAt: new Date(2026, 9, 19, 12, 0).getTime(),
        },
        {
          id: 't-2',
          title: 'Fix bugs',
          completed: false, // Incomplete must not be counted
          createdAt: 2000,
        },
      ];

      const result = calculateWeeklyMetrics({
        days,
        sessionHistory,
        tasks,
      });

      expect(result.totalFocusMinutes).toBe(75); // 25 + 50
      expect(result.totalFocusSessions).toBe(2);
      expect(result.totalCompletedTasks).toBe(1);
      expect(result.averageFocusMinutesPerDay).toBe(Math.round(75 / 7)); // 11
      expect(result.hasActivity).toBe(true);

      // Most productive day should be Oct 20 with 50 min
      expect(result.mostProductiveDay?.date).toBe('2026-10-20');
      expect(result.mostProductiveDay?.focusMinutes).toBe(50);
    });

    it('prevents counting the same completed task twice', () => {
      const taskDate = new Date(2026, 9, 20, 10, 0).getTime();
      const duplicateTasks: Task[] = [
        { id: 'task-1', title: 'Write tests', completed: true, createdAt: 100, completedAt: taskDate },
        { id: 'task-1', title: 'Write tests duplicate', completed: true, createdAt: 100, completedAt: taskDate },
      ];

      const result = calculateWeeklyMetrics({
        days,
        sessionHistory: [],
        tasks: duplicateTasks,
      });

      expect(result.totalCompletedTasks).toBe(1);
    });

    it('gracefully handles older records lacking localDate or completedAt without crashing', () => {
      const legacySessions: CompletedSessionRecord[] = [
        {
          id: 's-legacy',
          mode: 'focus',
          durationMs: 30 * 60 * 1000,
          completedAt: new Date(2026, 9, 21, 14, 0).getTime(),
          localDate: '', // Empty localDate
        },
      ];

      const legacyTasks: Task[] = [
        {
          id: 't-legacy',
          title: 'Legacy task',
          completed: true,
          createdAt: new Date(2026, 9, 21, 15, 0).getTime(),
          // No completedAt
        },
      ];

      const result = calculateWeeklyMetrics({
        days,
        sessionHistory: legacySessions,
        tasks: legacyTasks,
      });

      expect(result.totalFocusMinutes).toBe(30);
      expect(result.totalFocusSessions).toBe(1);
      expect(result.totalCompletedTasks).toBe(1);
      const oct21 = result.days.find((d) => d.date === '2026-10-21');
      expect(oct21?.focusMinutes).toBe(30);
      expect(oct21?.completedTasks).toBe(1);
    });

    it('computes week-over-week comparisons when previous week records exist', () => {
      const previousDays = [
        '2026-10-12',
        '2026-10-13',
        '2026-10-14',
        '2026-10-15',
        '2026-10-16',
        '2026-10-17',
        '2026-10-18',
      ];

      const sessionHistory: CompletedSessionRecord[] = [
        // Previous week: 50 min, 2 sessions
        {
          id: 'prev-1',
          mode: 'focus',
          durationMs: 50 * 60 * 1000,
          completedAt: 1000,
          localDate: '2026-10-14',
        },
        // Current week: 100 min, 4 sessions
        {
          id: 'curr-1',
          mode: 'focus',
          durationMs: 100 * 60 * 1000,
          completedAt: 2000,
          localDate: '2026-10-21',
        },
      ];

      const result = calculateWeeklyMetrics({
        days,
        sessionHistory,
        tasks: [],
        previousDays,
      });

      expect(result.comparison).toBeDefined();
      expect(result.comparison?.hasPreviousData).toBe(true);
      expect(result.comparison?.previousTotalFocusMinutes).toBe(50);
      expect(result.comparison?.focusMinutesDiff).toBe(50); // 100 - 50 = +50
      expect(result.comparison?.focusMinutesPercentDiff).toBe(100); // 100% increase
    });

    it('indicates hasPreviousData is false when previous week has no records', () => {
      const previousDays = ['2026-10-12', '2026-10-13'];
      const result = calculateWeeklyMetrics({
        days,
        sessionHistory: [],
        tasks: [],
        previousDays,
      });

      expect(result.comparison?.hasPreviousData).toBe(false);
      expect(result.comparison?.previousTotalFocusMinutes).toBe(0);
    });
  });
});
