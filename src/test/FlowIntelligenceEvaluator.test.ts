import { describe, it, expect } from 'vitest';
import {
  calculateFlowScore,
  rankTaskRecommendations,
  generatePersonalInsights,
  generateAdaptiveSuggestions,
} from '../utils/flowIntelligenceEvaluator';
import type { DailyProductivityStats, CompletedSessionRecord } from '../types/stats';
import type { DailyGoalsConfig } from '../types/goals';
import type { Task } from '../types/task';
import type { PlannedTask } from '../types/planner';
import type { SessionReflection } from '../types/intelligence';
import type { UserPreferences } from '../types/settings';

describe('flowIntelligenceEvaluator', () => {
  const defaultGoals: DailyGoalsConfig = {
    targetFocusMinutes: 60,
    targetFocusSessions: 4,
    targetCompletedTasks: 3,
    tasksGoalEnabled: true,
  };

  const defaultPreferences: UserPreferences = {
    focusDurationMinutes: 25,
    shortBreakDurationMinutes: 5,
    longBreakDurationMinutes: 15,
    theme: 'light',
    soundEnabled: true,
  };

  describe('calculateFlowScore', () => {
    it('handles zero activity safely and returns a 0 score with proper breakdown', () => {
      const emptyStats: DailyProductivityStats = {
        date: '2026-10-20',
        totalFocusMs: 0,
        totalFocusMinutes: 0,
        completedFocusSessions: 0,
        completedTasks: 0,
        hasActivity: false,
      };

      const result = calculateFlowScore({
        todayStats: emptyStats,
        dailyGoals: defaultGoals,
        todayPlannedTasks: [],
        todayReflections: [],
      });

      expect(result.totalScore).toBe(0);
      expect(result.focusTime.earned).toBe(0);
      expect(result.focusTime.max).toBe(40);
      expect(result.taskCompletion.earned).toBe(0);
      expect(result.taskCompletion.max).toBe(35);
      expect(result.sessionConsistency.earned).toBe(0);
      expect(result.sessionConsistency.max).toBe(25);
      expect(result.disclaimer).toContain('not a scientific or psychological measurement');
    });

    it('calculates proportional score when goals are partially met', () => {
      const partialStats: DailyProductivityStats = {
        date: '2026-10-20',
        totalFocusMs: 30 * 60000,
        totalFocusMinutes: 30, // 30/60 -> 50% * 40 = 20 pts
        completedFocusSessions: 2, // 2/4 -> 50% * 20 = 10 pts + (50% * 5 = 3 pts quality) = 13 pts
        completedTasks: 1, // 1/2 planned tasks -> 50% * 35 = 18 pts
        hasActivity: true,
      };

      const planned: PlannedTask[] = [
        { id: 't1', title: 'Task 1', completed: true, priority: 'high', date: '2026-10-20', createdAt: 1 },
        { id: 't2', title: 'Task 2', completed: false, priority: 'medium', date: '2026-10-20', createdAt: 2 },
      ];

      const result = calculateFlowScore({
        todayStats: partialStats,
        dailyGoals: defaultGoals,
        todayPlannedTasks: planned,
        todayReflections: [],
      });

      expect(result.focusTime.earned).toBe(20);
      expect(result.taskCompletion.earned).toBe(18); // round(0.5 * 35) = 18
      expect(result.sessionConsistency.earned).toBe(13); // round(0.5 * 20) + round(0.5 * 5) = 10 + 3 = 13
      expect(result.totalScore).toBe(51);
    });

    it('caps score at 100 when targets are exceeded', () => {
      const superStats: DailyProductivityStats = {
        date: '2026-10-20',
        totalFocusMs: 120 * 60000,
        totalFocusMinutes: 120, // 200%
        completedFocusSessions: 8, // 200%
        completedTasks: 5,
        hasActivity: true,
      };

      const reflections: SessionReflection[] = [
        { sessionId: 's1', completedAt: 1, localDate: '2026-10-20', quality: 'productive' },
        { sessionId: 's2', completedAt: 2, localDate: '2026-10-20', quality: 'productive' },
      ];

      const result = calculateFlowScore({
        todayStats: superStats,
        dailyGoals: defaultGoals,
        todayPlannedTasks: [],
        todayReflections: reflections,
      });

      expect(result.focusTime.earned).toBe(40);
      expect(result.taskCompletion.earned).toBe(35);
      expect(result.sessionConsistency.earned).toBe(25);
      expect(result.totalScore).toBe(100);
    });

    it('handles zero or missing daily goals gracefully without division by zero', () => {
      const zeroGoals: DailyGoalsConfig = {
        targetFocusMinutes: 0,
        targetFocusSessions: 0,
        targetCompletedTasks: 0,
        tasksGoalEnabled: false,
      };

      const stats: DailyProductivityStats = {
        date: '2026-10-20',
        totalFocusMs: 25 * 60000,
        totalFocusMinutes: 25,
        completedFocusSessions: 1,
        completedTasks: 1,
        hasActivity: true,
      };

      const result = calculateFlowScore({
        todayStats: stats,
        dailyGoals: zeroGoals,
        todayPlannedTasks: [],
        todayReflections: [],
      });

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(100);
    });
  });

  describe('rankTaskRecommendations', () => {
    const taskA: Task = { id: 'task-a', title: 'Fix bug', completed: false, createdAt: 1 };
    const taskB: Task = { id: 'task-b', title: 'Write tests', completed: false, createdAt: 2 };
    const taskC: Task = { id: 'task-c', title: 'Read docs', completed: false, createdAt: 3 };
    const completedTask: Task = { id: 'task-done', title: 'Done task', completed: true, createdAt: 4 };

    it('returns empty array when there are no eligible incomplete tasks', () => {
      const ranked = rankTaskRecommendations({
        tasks: [completedTask],
        plannedTasks: [],
        activeTaskId: null,
      });
      expect(ranked).toEqual([]);
    });

    it('prioritizes tasks marked as Today Top Priority', () => {
      const planned: PlannedTask[] = [
        { id: 'task-a', title: 'Fix bug', completed: false, priority: 'medium', isTodayPriority: true, date: '2026-10-20', createdAt: 1 },
        { id: 'task-b', title: 'Write tests', completed: false, priority: 'high', isTodayPriority: false, date: '2026-10-20', createdAt: 2 },
      ];

      const ranked = rankTaskRecommendations({
        tasks: [taskA, taskB],
        plannedTasks: planned,
        activeTaskId: null,
        currentTimeStr: '10:00',
      });

      expect(ranked[0].task.id).toBe('task-a');
      expect(ranked[0].reason).toContain("Marked as Today's Top Priority");
    });

    it('prioritizes overdue tasks over upcoming tasks', () => {
      const planned: PlannedTask[] = [
        { id: 'task-a', title: 'Fix bug', completed: false, priority: 'medium', deadline: '09:00', date: '2026-10-20', createdAt: 1 },
        { id: 'task-b', title: 'Write tests', completed: false, priority: 'medium', deadline: '14:00', date: '2026-10-20', createdAt: 2 },
      ];

      const ranked = rankTaskRecommendations({
        tasks: [taskA, taskB],
        plannedTasks: planned,
        activeTaskId: null,
        currentTimeStr: '10:00',
      });

      expect(ranked[0].task.id).toBe('task-a');
      expect(ranked[0].isOverdue).toBe(true);
      expect(ranked[0].reason).toContain('Overdue');
    });

    it('boosts currently active focus task', () => {
      const ranked = rankTaskRecommendations({
        tasks: [taskA, taskB],
        plannedTasks: [],
        activeTaskId: 'task-b',
      });

      expect(ranked[0].task.id).toBe('task-b');
      expect(ranked[0].reason).toContain('Currently chosen as active focus goal');
    });

    it('excludes dismissed tasks from recommendations', () => {
      const ranked = rankTaskRecommendations({
        tasks: [taskA, taskB, taskC],
        plannedTasks: [],
        activeTaskId: null,
        dismissedTaskIds: ['task-a', 'task-b'],
      });

      expect(ranked).toHaveLength(1);
      expect(ranked[0].task.id).toBe('task-c');
    });
  });

  describe('generatePersonalInsights', () => {
    it('labels insufficient data when fewer than 3 focus sessions exist', () => {
      const shortHistory: CompletedSessionRecord[] = [
        { id: 's1', mode: 'focus', durationMs: 25 * 60000, completedAt: 1714000000000, localDate: '2026-10-20' },
      ];

      const insights = generatePersonalInsights({
        sessionHistory: shortHistory,
        reflections: [],
      });

      expect(insights.peakTimeOfDay.isSufficient).toBe(false);
      expect(insights.peakTimeOfDay.summary).toContain('Insufficient data');
      expect(insights.averageDuration.isSufficient).toBe(false);
      expect(insights.averageDuration.summary).toContain('Insufficient data');
      expect(insights.sessionQuality.isSufficient).toBe(false);
      expect(insights.sessionQuality.summary).toContain('Insufficient data');
    });

    it('calculates peak time of day and average duration when sufficient sessions exist', () => {
      // 3 Morning sessions at 09:00 (timestamp around morning)
      const morningDate = new Date('2026-10-20T09:30:00');
      const sessions: CompletedSessionRecord[] = [
        { id: 's1', mode: 'focus', durationMs: 25 * 60000, completedAt: morningDate.getTime(), localDate: '2026-10-20' },
        { id: 's2', mode: 'focus', durationMs: 25 * 60000, completedAt: morningDate.getTime() + 1800000, localDate: '2026-10-20' },
        { id: 's3', mode: 'focus', durationMs: 30 * 60000, completedAt: morningDate.getTime() + 3600000, localDate: '2026-10-20' },
      ];

      const reflections: SessionReflection[] = [
        { sessionId: 's1', completedAt: 1, localDate: '2026-10-20', quality: 'productive' },
        { sessionId: 's2', completedAt: 2, localDate: '2026-10-20', quality: 'productive' },
        { sessionId: 's3', completedAt: 3, localDate: '2026-10-20', quality: 'distracted' },
      ];

      const insights = generatePersonalInsights({
        sessionHistory: sessions,
        reflections,
      });

      expect(insights.peakTimeOfDay.isSufficient).toBe(true);
      expect(insights.peakTimeOfDay.bestWindow?.windowName).toBe('Morning');
      expect(insights.peakTimeOfDay.summary).toContain('Morning');

      expect(insights.averageDuration.isSufficient).toBe(true);
      expect(insights.averageDuration.averageMinutes).toBe(27); // (25 + 25 + 30) / 3 = 26.66 -> 27

      expect(insights.sessionQuality.isSufficient).toBe(true);
      expect(insights.sessionQuality.productiveCount).toBe(2);
      expect(insights.sessionQuality.distractedCount).toBe(1);
    });
  });

  describe('generateAdaptiveSuggestions', () => {
    it('returns baseline current preferences when evidence is limited (< 3 sessions)', () => {
      const suggestion = generateAdaptiveSuggestions({
        sessionHistory: [],
        reflections: [],
        currentPreferences: defaultPreferences,
      });

      expect(suggestion.evidenceLevel).toBe('limited');
      expect(suggestion.isDifferentFromCurrent).toBe(false);
      expect(suggestion.focusDurationMinutes).toBe(25);
      expect(suggestion.shortBreakDurationMinutes).toBe(5);
      expect(suggestion.reason).toContain('Evidence is limited');
    });

    it('suggests shorter 20m focus sprint when distractions/interruptions exceed 40%', () => {
      const sessions: CompletedSessionRecord[] = [
        { id: 's1', mode: 'focus', durationMs: 25 * 60000, completedAt: 1, localDate: '2026-10-20' },
        { id: 's2', mode: 'focus', durationMs: 25 * 60000, completedAt: 2, localDate: '2026-10-20' },
        { id: 's3', mode: 'focus', durationMs: 25 * 60000, completedAt: 3, localDate: '2026-10-20' },
      ];

      const reflections: SessionReflection[] = [
        { sessionId: 's1', completedAt: 1, localDate: '2026-10-20', quality: 'distracted' },
        { sessionId: 's2', completedAt: 2, localDate: '2026-10-20', quality: 'interrupted' },
        { sessionId: 's3', completedAt: 3, localDate: '2026-10-20', quality: 'productive' },
      ];

      const suggestion = generateAdaptiveSuggestions({
        sessionHistory: sessions,
        reflections,
        currentPreferences: defaultPreferences,
      });

      expect(suggestion.evidenceLevel).toBe('sufficient');
      expect(suggestion.focusDurationMinutes).toBe(20);
      expect(suggestion.shortBreakDurationMinutes).toBe(5);
      expect(suggestion.isDifferentFromCurrent).toBe(true);
      expect(suggestion.reason).toContain('tighter 20-minute focus sprint');
    });

    it('suggests deepening sprint to 30m when user consistently reports productive flow (>=75%)', () => {
      const sessions: CompletedSessionRecord[] = [
        { id: 's1', mode: 'focus', durationMs: 25 * 60000, completedAt: 1, localDate: '2026-10-20' },
        { id: 's2', mode: 'focus', durationMs: 25 * 60000, completedAt: 2, localDate: '2026-10-20' },
        { id: 's3', mode: 'focus', durationMs: 25 * 60000, completedAt: 3, localDate: '2026-10-20' },
        { id: 's4', mode: 'focus', durationMs: 25 * 60000, completedAt: 4, localDate: '2026-10-20' },
      ];

      const reflections: SessionReflection[] = [
        { sessionId: 's1', completedAt: 1, localDate: '2026-10-20', quality: 'productive' },
        { sessionId: 's2', completedAt: 2, localDate: '2026-10-20', quality: 'productive' },
        { sessionId: 's3', completedAt: 3, localDate: '2026-10-20', quality: 'productive' },
        { sessionId: 's4', completedAt: 4, localDate: '2026-10-20', quality: 'productive' },
      ];

      const suggestion = generateAdaptiveSuggestions({
        sessionHistory: sessions,
        reflections,
        currentPreferences: defaultPreferences,
      });

      expect(suggestion.evidenceLevel).toBe('sufficient');
      expect(suggestion.focusDurationMinutes).toBe(30);
      expect(suggestion.shortBreakDurationMinutes).toBe(6);
      expect(suggestion.isDifferentFromCurrent).toBe(true);
      expect(suggestion.reason).toContain('Extending to 30 minutes');
    });
  });
});
