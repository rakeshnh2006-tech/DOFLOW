import { describe, it, expect } from 'vitest';
import {
  isHabitScheduledOnDate,
  getLocalDateString,
  calculateHabitStreak,
  getHabitMonthCalendar,
  formatScheduleDescription,
} from '../utils/streakUtils';
import type { Habit, HabitCompletion } from '../types/habit';

describe('StreakUtils', () => {
  const baseHabit: Habit = {
    id: 'habit-1',
    name: 'Morning Meditation',
    frequency: 'daily',
    createdAt: Date.now(),
    archived: false,
  };

  describe('isHabitScheduledOnDate', () => {
    it('returns true for every day on a daily habit', () => {
      const sunday = new Date('2026-10-18T10:00:00'); // Sunday (day 0)
      const monday = new Date('2026-10-19T10:00:00'); // Monday (day 1)
      const saturday = new Date('2026-10-24T10:00:00'); // Saturday (day 6)

      expect(isHabitScheduledOnDate(baseHabit, sunday)).toBe(true);
      expect(isHabitScheduledOnDate(baseHabit, monday)).toBe(true);
      expect(isHabitScheduledOnDate(baseHabit, saturday)).toBe(true);
    });

    it('returns true only for Monday through Friday on weekdays habit', () => {
      const weekdayHabit: Habit = {
        ...baseHabit,
        frequency: 'weekdays',
      };

      const sunday = new Date('2026-10-18T10:00:00'); // Day 0
      const monday = new Date('2026-10-19T10:00:00'); // Day 1
      const wednesday = new Date('2026-10-21T10:00:00'); // Day 3
      const friday = new Date('2026-10-23T10:00:00'); // Day 5
      const saturday = new Date('2026-10-24T10:00:00'); // Day 6

      expect(isHabitScheduledOnDate(weekdayHabit, sunday)).toBe(false);
      expect(isHabitScheduledOnDate(weekdayHabit, monday)).toBe(true);
      expect(isHabitScheduledOnDate(weekdayHabit, wednesday)).toBe(true);
      expect(isHabitScheduledOnDate(weekdayHabit, friday)).toBe(true);
      expect(isHabitScheduledOnDate(weekdayHabit, saturday)).toBe(false);
    });

    it('returns true only for specified custom days', () => {
      // Scheduled for Tuesday (2) and Thursday (4)
      const customHabit: Habit = {
        ...baseHabit,
        frequency: 'custom',
        customDays: [2, 4],
      };

      const monday = new Date('2026-10-19T10:00:00'); // Day 1
      const tuesday = new Date('2026-10-20T10:00:00'); // Day 2
      const wednesday = new Date('2026-10-21T10:00:00'); // Day 3
      const thursday = new Date('2026-10-22T10:00:00'); // Day 4

      expect(isHabitScheduledOnDate(customHabit, monday)).toBe(false);
      expect(isHabitScheduledOnDate(customHabit, tuesday)).toBe(true);
      expect(isHabitScheduledOnDate(customHabit, wednesday)).toBe(false);
      expect(isHabitScheduledOnDate(customHabit, thursday)).toBe(true);
    });
  });

  describe('formatScheduleDescription', () => {
    it('formats daily, weekdays, and custom schedules properly', () => {
      expect(formatScheduleDescription('daily')).toBe('Every day');
      expect(formatScheduleDescription('weekdays')).toBe('Mon – Fri');
      expect(formatScheduleDescription('custom', [1, 3, 5])).toBe('Mon, Wed, Fri');
      expect(formatScheduleDescription('custom', [])).toBe('No days selected');
    });
  });

  describe('calculateHabitStreak', () => {
    const today = '2026-10-20'; // Tuesday
    const yesterday = '2026-10-19'; // Monday
    const twoDaysAgo = '2026-10-18'; // Sunday

    it('returns 0 streaks when there are no completions', () => {
      const streak = calculateHabitStreak({
        habit: baseHabit,
        completions: [],
        referenceDateStr: today,
      });
      expect(streak.currentStreak).toBe(0);
      expect(streak.longestStreak).toBe(0);
      expect(streak.isCompletedToday).toBe(false);
    });

    it('calculates current streak of 1 when completed only today', () => {
      const completions: HabitCompletion[] = [
        { id: 'c-1', habitId: 'habit-1', date: today, completedAt: 1000 },
      ];

      const streak = calculateHabitStreak({
        habit: baseHabit,
        completions,
        referenceDateStr: today,
      });
      expect(streak.currentStreak).toBe(1);
      expect(streak.longestStreak).toBe(1);
      expect(streak.isCompletedToday).toBe(true);
    });

    it('does NOT break streak when today is pending and yesterday was completed', () => {
      // User completed yesterday and two days ago, but has not completed today yet.
      const completions: HabitCompletion[] = [
        { id: 'c-1', habitId: 'habit-1', date: yesterday, completedAt: 1000 },
        { id: 'c-2', habitId: 'habit-1', date: twoDaysAgo, completedAt: 2000 },
      ];

      const streak = calculateHabitStreak({
        habit: baseHabit,
        completions,
        referenceDateStr: today,
      });
      expect(streak.isCompletedToday).toBe(false);
      // Streak should be preserved as 2 because today is still in progress
      expect(streak.currentStreak).toBe(2);
      expect(streak.longestStreak).toBe(2);
    });

    it('increments streak when today is then completed', () => {
      const completions: HabitCompletion[] = [
        { id: 'c-1', habitId: 'habit-1', date: yesterday, completedAt: 1000 },
        { id: 'c-2', habitId: 'habit-1', date: twoDaysAgo, completedAt: 2000 },
        { id: 'c-3', habitId: 'habit-1', date: today, completedAt: 3000 },
      ];

      const streak = calculateHabitStreak({
        habit: baseHabit,
        completions,
        referenceDateStr: today,
      });
      expect(streak.isCompletedToday).toBe(true);
      expect(streak.currentStreak).toBe(3);
      expect(streak.longestStreak).toBe(3);
    });

    it('breaks current streak if a past scheduled day was missed', () => {
      // Missed yesterday (2026-10-19), but completed two days ago (2026-10-18)
      const completions: HabitCompletion[] = [
        { id: 'c-1', habitId: 'habit-1', date: twoDaysAgo, completedAt: 1000 },
      ];

      const streak = calculateHabitStreak({
        habit: baseHabit,
        completions,
        referenceDateStr: today,
      });
      // Since yesterday was scheduled and missed, current streak is 0
      expect(streak.currentStreak).toBe(0);
      // Longest streak remembers the past completion
      expect(streak.longestStreak).toBe(1);
    });

    it('does NOT break streak on unscheduled days (weekdays habit)', () => {
      const weekdayHabit: Habit = {
        ...baseHabit,
        frequency: 'weekdays',
      };

      // 2026-10-16: Friday (completed)
      // 2026-10-17: Saturday (unscheduled)
      // 2026-10-18: Sunday (unscheduled)
      // 2026-10-19: Monday (completed)
      // 2026-10-20: Tuesday (today, completed)
      const completions: HabitCompletion[] = [
        { id: 'c-1', habitId: 'habit-1', date: '2026-10-16', completedAt: 1000 },
        { id: 'c-2', habitId: 'habit-1', date: '2026-10-19', completedAt: 2000 },
        { id: 'c-3', habitId: 'habit-1', date: '2026-10-20', completedAt: 3000 },
      ];

      const streak = calculateHabitStreak({
        habit: weekdayHabit,
        completions,
        referenceDateStr: '2026-10-20',
      });
      // Consecutive scheduled days: Fri, Mon, Tue = 3 scheduled days
      expect(streak.currentStreak).toBe(3);
      expect(streak.longestStreak).toBe(3);
    });

    it('does NOT break streak on unscheduled days when today is Monday pending', () => {
      const weekdayHabit: Habit = {
        ...baseHabit,
        frequency: 'weekdays',
      };

      // Completed on Friday 2026-10-16. Sat and Sun unscheduled. Monday 2026-10-19 is today, not completed yet.
      const completions: HabitCompletion[] = [
        { id: 'c-1', habitId: 'habit-1', date: '2026-10-16', completedAt: 1000 },
      ];

      const streak = calculateHabitStreak({
        habit: weekdayHabit,
        completions,
        referenceDateStr: '2026-10-19',
      });
      expect(streak.isCompletedToday).toBe(false);
      // Streak from Friday preserved
      expect(streak.currentStreak).toBe(1);
    });

    it('calculates longest streak independently from current streak', () => {
      // Habit completed 4 consecutive days in early October, then missed 3 days, now completed 1 day
      const completions: HabitCompletion[] = [
        { id: 'c-1', habitId: 'habit-1', date: '2026-10-01', completedAt: 1 },
        { id: 'c-2', habitId: 'habit-1', date: '2026-10-02', completedAt: 2 },
        { id: 'c-3', habitId: 'habit-1', date: '2026-10-03', completedAt: 3 },
        { id: 'c-4', habitId: 'habit-1', date: '2026-10-04', completedAt: 4 },
        // Missed Oct 5, 6, 7
        { id: 'c-5', habitId: 'habit-1', date: today, completedAt: 5 },
      ];

      const streak = calculateHabitStreak({
        habit: baseHabit,
        completions,
        referenceDateStr: today,
      });
      expect(streak.currentStreak).toBe(1);
      expect(streak.longestStreak).toBe(4);
    });

    it('calculates completion rate percentage accurately', () => {
      // In last 7 days, 4 completions out of 7 scheduled days
      const completions: HabitCompletion[] = [
        { id: 'c-1', habitId: 'habit-1', date: '2026-10-20', completedAt: 1 },
        { id: 'c-2', habitId: 'habit-1', date: '2026-10-19', completedAt: 2 },
        { id: 'c-3', habitId: 'habit-1', date: '2026-10-18', completedAt: 3 },
        { id: 'c-4', habitId: 'habit-1', date: '2026-10-17', completedAt: 4 },
      ];

      const streak = calculateHabitStreak({
        habit: baseHabit,
        completions,
        referenceDateStr: '2026-10-20',
        period: '7days',
      });
      // 4 out of 7 = 57%
      expect(streak.completionRatePercent).toBe(57);
    });
  });

  describe('getHabitMonthCalendar', () => {
    it('generates a full calendar grid including padding days', () => {
      const cells = getHabitMonthCalendar({
        habit: baseHabit,
        completions: [],
        year: 2026,
        month: 9, // Month 9 = October (0-indexed)
      });
      expect(cells.length).toBeGreaterThanOrEqual(35);
      expect(cells.length % 7).toBe(0);
    });

    it('identifies completed, missed, and rest days accurately', () => {
      const weekdayHabit: Habit = {
        ...baseHabit,
        frequency: 'weekdays',
      };

      const completions: HabitCompletion[] = [
        { id: 'c-1', habitId: 'habit-1', date: '2026-10-19', completedAt: 1000 }, // Mon (completed)
      ];

      const cells = getHabitMonthCalendar({
        habit: weekdayHabit,
        completions,
        year: 2026,
        month: 9,
      });

      // Check Monday Oct 19
      const oct19 = cells.find((c) => c.dateStr === '2026-10-19');
      expect(oct19?.isCompleted).toBe(true);
      expect(oct19?.status).toBe('completed');

      // Check Sunday Oct 18 (unscheduled for weekdays habit)
      const oct18 = cells.find((c) => c.dateStr === '2026-10-18');
      expect(oct18?.isScheduled).toBe(false);
      expect(oct18?.status).toBe('rest-day');

      // Check past Friday Oct 16 (scheduled but not completed -> missed)
      const oct16 = cells.find((c) => c.dateStr === '2026-10-16');
      expect(oct16?.isScheduled).toBe(true);
      expect(oct16?.isCompleted).toBe(false);
      expect(oct16?.status).toBe('missed');
    });
  });

  describe('getLocalDateString', () => {
    it('formats year-month-day consistently as YYYY-MM-DD', () => {
      const date = new Date(2026, 4, 9, 12, 0, 0); // May 9, 2026
      expect(getLocalDateString(date.getTime())).toBe('2026-05-09');
    });
  });
});
