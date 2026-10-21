import { useCallback, useMemo, useState } from 'react';
import type {
  AchievementFilter,
  AchievementProgress,
  DailyGoalProgressItem,
  DailyGoalsConfig,
} from '../types/goals';
import type { CompletedSessionRecord, DailyProductivityStats } from '../types/stats';
import type { Task } from '../types/task';
import type { HabitWithStreak } from '../types/habit';
import type { PlannedTask } from '../types/planner';
import {
  loadDailyGoalsFromStorage,
  loadUnlockedAchievementsFromStorage,
  saveDailyGoalsToStorage,
  saveUnlockedAchievementsToStorage,
} from '../utils/goalsStorage';
import {
  calculateDailyGoalsProgress,
  evaluateAchievements,
} from '../utils/achievementEvaluator';

export interface UseGoalsOptions {
  sessionHistory: CompletedSessionRecord[];
  todayStats: DailyProductivityStats;
  tasks: Task[];
  habits: HabitWithStreak[];
  plannerTasks?: PlannedTask[];
}

export interface UseGoalsReturn {
  dailyGoals: DailyGoalsConfig;
  updateDailyGoals: (newGoals: DailyGoalsConfig) => void;
  dailyGoalsProgress: DailyGoalProgressItem[];
  achievements: AchievementProgress[];
  filteredAchievements: AchievementProgress[];
  unlockedCount: number;
  totalAchievementsCount: number;
  filter: AchievementFilter;
  setFilter: (f: AchievementFilter) => void;
}

export function useGoals({
  sessionHistory,
  todayStats,
  tasks,
  habits,
  plannerTasks = [],
}: UseGoalsOptions): UseGoalsReturn {
  const [dailyGoals, setDailyGoals] = useState<DailyGoalsConfig>(() =>
    loadDailyGoalsFromStorage()
  );

  const [savedUnlockedMap, setSavedUnlockedMap] = useState<Record<string, number>>(() =>
    loadUnlockedAchievementsFromStorage()
  );

  const [filter, setFilter] = useState<AchievementFilter>('all');

  const updateDailyGoals = useCallback((newGoals: DailyGoalsConfig) => {
    setDailyGoals(newGoals);
    saveDailyGoalsToStorage(newGoals);
  }, []);

  // Evaluate achievements whenever relevant underlying activity changes
  const evaluation = useMemo(() => {
    return evaluateAchievements({
      sessionHistory,
      todayStats,
      tasks,
      habits,
      plannerTasks,
      dailyGoals,
      savedUnlockedMap,
    });
  }, [sessionHistory, todayStats, tasks, habits, plannerTasks, dailyGoals, savedUnlockedMap]);

  // Adjust state and persist when new achievements are unlocked
  if (evaluation.hasNewUnlock) {
    setSavedUnlockedMap(evaluation.updatedUnlockedMap);
    saveUnlockedAchievementsToStorage(evaluation.updatedUnlockedMap);
  }

  // Daily goals progress indicators
  const dailyGoalsProgress = useMemo(() => {
    return calculateDailyGoalsProgress(dailyGoals, todayStats);
  }, [dailyGoals, todayStats]);

  const achievements = evaluation.achievements;

  const unlockedCount = useMemo(() => {
    return achievements.filter((a) => a.isUnlocked).length;
  }, [achievements]);

  const filteredAchievements = useMemo(() => {
    if (filter === 'unlocked') {
      return achievements.filter((a) => a.isUnlocked);
    }
    if (filter === 'locked') {
      return achievements.filter((a) => !a.isUnlocked);
    }
    return achievements;
  }, [achievements, filter]);

  return {
    dailyGoals,
    updateDailyGoals,
    dailyGoalsProgress,
    achievements,
    filteredAchievements,
    unlockedCount,
    totalAchievementsCount: achievements.length,
    filter,
    setFilter,
  };
}
