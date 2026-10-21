import { describe, it, expect } from 'vitest';
import {
  evaluateAchievements,
  calculateDailyGoalsProgress,
  ACHIEVEMENT_DEFINITIONS,
} from '../utils/achievementEvaluator';
import type { CompletedSessionRecord, DailyProductivityStats } from '../types/stats';
import type { Task } from '../types/task';
import type { HabitWithStreak } from '../types/habit';
import type { PlannedTask } from '../types/planner';
import type { DailyGoalsConfig } from '../types/goals';

describe('AchievementEvaluator', () => {
  const defaultGoals: DailyGoalsConfig = {
    targetFocusMinutes: 60,
    targetFocusSessions: 4,
    tasksGoalEnabled: true,
    targetCompletedTasks: 3,
  };

  const emptyStats: DailyProductivityStats = {
    date: '2026-10-20',
    completedFocusSessions: 0,
    totalFocusMs: 0,
    totalFocusMinutes: 0,
    completedTasks: 0,
    hasActivity: false,
  };

  describe('calculateDailyGoalsProgress', () => {
    it('calculates 0% progress and full remaining amounts on zero activity', () => {
      const progress = calculateDailyGoalsProgress(defaultGoals, emptyStats);
      expect(progress).toHaveLength(3);

      const minutes = progress.find((p) => p.id === 'minutes');
      expect(minutes?.current).toBe(0);
      expect(minutes?.target).toBe(60);
      expect(minutes?.remaining).toBe(60);
      expect(minutes?.percent).toBe(0);
      expect(minutes?.isCompleted).toBe(false);

      const sessions = progress.find((p) => p.id === 'sessions');
      expect(sessions?.current).toBe(0);
      expect(sessions?.target).toBe(4);
      expect(sessions?.remaining).toBe(4);
      expect(sessions?.percent).toBe(0);
      expect(sessions?.isCompleted).toBe(false);

      const tasks = progress.find((p) => p.id === 'tasks');
      expect(tasks?.current).toBe(0);
      expect(tasks?.target).toBe(3);
      expect(tasks?.remaining).toBe(3);
      expect(tasks?.percent).toBe(0);
      expect(tasks?.isCompleted).toBe(false);
      expect(tasks?.enabled).toBe(true);
    });

    it('calculates partial and completed progress accurately', () => {
      const activeStats: DailyProductivityStats = {
        date: '2026-10-20',
        completedFocusSessions: 2,
        totalFocusMs: 50 * 60 * 1000,
        totalFocusMinutes: 50,
        completedTasks: 3,
        hasActivity: true,
      };

      const progress = calculateDailyGoalsProgress(defaultGoals, activeStats);

      // Focus minutes: 50 / 60 (83%)
      const minutes = progress.find((p) => p.id === 'minutes');
      expect(minutes?.current).toBe(50);
      expect(minutes?.remaining).toBe(10);
      expect(minutes?.percent).toBe(83);
      expect(minutes?.isCompleted).toBe(false);

      // Focus sessions: 2 / 4 (50%)
      const sessions = progress.find((p) => p.id === 'sessions');
      expect(sessions?.current).toBe(2);
      expect(sessions?.remaining).toBe(2);
      expect(sessions?.percent).toBe(50);
      expect(sessions?.isCompleted).toBe(false);

      // Tasks: 3 / 3 (100% completed)
      const tasks = progress.find((p) => p.id === 'tasks');
      expect(tasks?.current).toBe(3);
      expect(tasks?.remaining).toBe(0);
      expect(tasks?.percent).toBe(100);
      expect(tasks?.isCompleted).toBe(true);
    });

    it('respects tasksGoalEnabled disabled setting', () => {
      const disabledTasksGoals: DailyGoalsConfig = {
        ...defaultGoals,
        tasksGoalEnabled: false,
      };

      const progress = calculateDailyGoalsProgress(disabledTasksGoals, emptyStats);
      const tasks = progress.find((p) => p.id === 'tasks');
      expect(tasks?.enabled).toBe(false);
    });
  });

  describe('evaluateAchievements', () => {
    it('returns all achievements locked when history is completely empty', () => {
      const result = evaluateAchievements({
        sessionHistory: [],
        todayStats: emptyStats,
        tasks: [],
        habits: [],
        plannerTasks: [],
        dailyGoals: defaultGoals,
        savedUnlockedMap: {},
      });

      expect(result.achievements).toHaveLength(ACHIEVEMENT_DEFINITIONS.length);
      expect(result.hasNewUnlock).toBe(false);
      const unlocked = result.achievements.filter((a) => a.isUnlocked);
      expect(unlocked).toHaveLength(0);
    });

    it('unlocks first_focus_session strictly on focus session, not break sessions', () => {
      // 1. Only break session completed
      const breakSession: CompletedSessionRecord = {
        id: 's-break',
        mode: 'shortBreak',
        durationMs: 5 * 60 * 1000,
        completedAt: 1000,
        localDate: '2026-10-20',
      };

      const breakResult = evaluateAchievements({
        sessionHistory: [breakSession],
        todayStats: emptyStats,
        tasks: [],
        habits: [],
        dailyGoals: defaultGoals,
        savedUnlockedMap: {},
      });

      const breakFirstFocus = breakResult.achievements.find(
        (a) => a.id === 'first_focus_session'
      );
      expect(breakFirstFocus?.isUnlocked).toBe(false);

      // 2. Add real completed focus session
      const focusSession: CompletedSessionRecord = {
        id: 's-focus',
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
        completedAt: 2000,
        localDate: '2026-10-20',
      };

      const focusResult = evaluateAchievements({
        sessionHistory: [focusSession],
        todayStats: emptyStats,
        tasks: [],
        habits: [],
        dailyGoals: defaultGoals,
        savedUnlockedMap: {},
      });

      const focusUnlocked = focusResult.achievements.find(
        (a) => a.id === 'first_focus_session'
      );
      expect(focusUnlocked?.isUnlocked).toBe(true);
      expect(focusResult.hasNewUnlock).toBe(true);
      expect(focusResult.updatedUnlockedMap.first_focus_session).toBeDefined();
    });

    it('unlocks hundred_focus_minutes when accumulated focus time reaches 100 mins', () => {
      // 4 focus sessions of 25 min = 100 minutes
      const sessions: CompletedSessionRecord[] = [1, 2, 3, 4].map((i) => ({
        id: `s-${i}`,
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
        completedAt: 1000 + i * 100,
        localDate: '2026-10-20',
      }));

      const result = evaluateAchievements({
        sessionHistory: sessions,
        todayStats: emptyStats,
        tasks: [],
        habits: [],
        dailyGoals: defaultGoals,
        savedUnlockedMap: {},
      });

      const hundred = result.achievements.find((a) => a.id === 'hundred_focus_minutes');
      expect(hundred?.isUnlocked).toBe(true);
      expect(hundred?.currentValue).toBe(100);
      expect(hundred?.progressPercent).toBe(100);
    });

    it('unlocks daily_focus_target_reached when daily focus goal is reached', () => {
      const statsWithGoalMet: DailyProductivityStats = {
        ...emptyStats,
        totalFocusMinutes: 60, // Equal to targetFocusMinutes (60)
        hasActivity: true,
      };

      const result = evaluateAchievements({
        sessionHistory: [],
        todayStats: statsWithGoalMet,
        tasks: [],
        habits: [],
        dailyGoals: defaultGoals,
        savedUnlockedMap: {},
      });

      const goalAchieved = result.achievements.find(
        (a) => a.id === 'daily_focus_target_reached'
      );
      expect(goalAchieved?.isUnlocked).toBe(true);
    });

    it('unlocks seven_day_habit_streak when a habit reaches a 7-day streak', () => {
      const habitWithStreak: HabitWithStreak = {
        id: 'h-1',
        name: 'Morning Reading',
        frequency: 'daily',
        createdAt: 1000,
        archived: false,
        streak: {
          currentStreak: 7,
          longestStreak: 7,
          totalCompletions: 7,
          completionRatePercent: 100,
          isCompletedToday: true,
          isScheduledToday: true,
        },
      };

      const result = evaluateAchievements({
        sessionHistory: [],
        todayStats: emptyStats,
        tasks: [],
        habits: [habitWithStreak],
        dailyGoals: defaultGoals,
        savedUnlockedMap: {},
      });

      const habitMilestone = result.achievements.find(
        (a) => a.id === 'seven_day_habit_streak'
      );
      expect(habitMilestone?.isUnlocked).toBe(true);
    });

    it('unlocks first_task_completed and five_tasks_completed on real completed tasks', () => {
      const fiveTasks: Task[] = [1, 2, 3, 4, 5].map((i) => ({
        id: `t-${i}`,
        title: `Task ${i}`,
        completed: true,
        createdAt: 1000,
        completedAt: 2000,
      }));

      const result = evaluateAchievements({
        sessionHistory: [],
        todayStats: emptyStats,
        tasks: fiveTasks,
        habits: [],
        dailyGoals: defaultGoals,
        savedUnlockedMap: {},
      });

      const firstTask = result.achievements.find((a) => a.id === 'first_task_completed');
      const fiveTasksMilestone = result.achievements.find(
        (a) => a.id === 'five_tasks_completed'
      );

      expect(firstTask?.isUnlocked).toBe(true);
      expect(fiveTasksMilestone?.isUnlocked).toBe(true);
    });

    it('unlocks planner_task_completed when a planned task is completed', () => {
      const plannedTasks: PlannedTask[] = [
        {
          id: 'p-1',
          title: 'Design Review',
          priority: 'high',
          completed: true,
          createdAt: 1000,
          date: '2026-10-20',
        },
      ];

      const result = evaluateAchievements({
        sessionHistory: [],
        todayStats: emptyStats,
        tasks: [],
        habits: [],
        plannerTasks: plannedTasks,
        dailyGoals: defaultGoals,
        savedUnlockedMap: {},
      });

      const plannerMilestone = result.achievements.find(
        (a) => a.id === 'planner_task_completed'
      );
      expect(plannerMilestone?.isUnlocked).toBe(true);
    });

    it('preserves existing unlock timestamps and prevents duplicate awards', () => {
      const originalTimestamp = 1729400000000;
      const savedUnlockedMap = {
        first_focus_session: originalTimestamp,
      };

      const focusSession: CompletedSessionRecord = {
        id: 's-focus',
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
        completedAt: Date.now(),
        localDate: '2026-10-20',
      };

      const result = evaluateAchievements({
        sessionHistory: [focusSession],
        todayStats: emptyStats,
        tasks: [],
        habits: [],
        dailyGoals: defaultGoals,
        savedUnlockedMap,
      });

      const firstFocus = result.achievements.find(
        (a) => a.id === 'first_focus_session'
      );
      expect(firstFocus?.isUnlocked).toBe(true);
      // Keeps original timestamp
      expect(firstFocus?.unlockedAt).toBe(originalTimestamp);
      expect(result.hasNewUnlock).toBe(false);
    });
  });
});
