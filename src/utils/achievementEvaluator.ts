import type {
  AchievementDefinition,
  AchievementProgress,
  DailyGoalProgressItem,
  DailyGoalsConfig,
} from '../types/goals';
import type { CompletedSessionRecord, DailyProductivityStats } from '../types/stats';
import type { Task } from '../types/task';
import type { HabitWithStreak } from '../types/habit';
import type { PlannedTask } from '../types/planner';

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_focus_session',
    title: 'First Step',
    description: 'Complete your first focus session',
    category: 'focus',
    targetValue: 1,
    unit: 'session',
  },
  {
    id: 'five_focus_sessions',
    title: 'Focus Rhythm',
    description: 'Complete 5 focus sessions',
    category: 'focus',
    targetValue: 5,
    unit: 'sessions',
  },
  {
    id: 'ten_focus_sessions',
    title: 'Focus Mastery',
    description: 'Complete 10 focus sessions',
    category: 'focus',
    targetValue: 10,
    unit: 'sessions',
  },
  {
    id: 'daily_focus_target_reached',
    title: 'Target Achieved',
    description: 'Reach your daily focus minutes target',
    category: 'goals',
    targetValue: 1,
    unit: 'day',
  },
  {
    id: 'seven_day_habit_streak',
    title: 'Habit Pioneer',
    description: 'Achieve a 7-day streak on any habit',
    category: 'habits',
    targetValue: 7,
    unit: 'days',
  },
  {
    id: 'hundred_focus_minutes',
    title: 'Century Club',
    description: 'Accumulate 100 total minutes of focus time',
    category: 'focus',
    targetValue: 100,
    unit: 'minutes',
  },
  {
    id: 'first_task_completed',
    title: 'Task Finisher',
    description: 'Complete your first task',
    category: 'tasks',
    targetValue: 1,
    unit: 'task',
  },
  {
    id: 'five_tasks_completed',
    title: 'Productivity Engine',
    description: 'Complete 5 tasks',
    category: 'tasks',
    targetValue: 5,
    unit: 'tasks',
  },
  {
    id: 'planner_task_completed',
    title: 'Plan & Execute',
    description: 'Complete a scheduled task in the Daily Planner',
    category: 'tasks',
    targetValue: 1,
    unit: 'task',
  },
];

export interface EvaluateAchievementsInput {
  sessionHistory: CompletedSessionRecord[];
  todayStats: DailyProductivityStats;
  tasks: Task[];
  habits: HabitWithStreak[];
  plannerTasks?: PlannedTask[];
  dailyGoals: DailyGoalsConfig;
  savedUnlockedMap: Record<string, number>;
}

export interface EvaluateAchievementsResult {
  achievements: AchievementProgress[];
  updatedUnlockedMap: Record<string, number>;
  hasNewUnlock: boolean;
}

/**
 * Evaluates achievement milestones strictly against real recorded user activity.
 * Recalculates progress accurately, persists already earned milestones, and awards new ones.
 */
export function evaluateAchievements({
  sessionHistory,
  todayStats,
  tasks,
  habits,
  plannerTasks = [],
  dailyGoals,
  savedUnlockedMap,
}: EvaluateAchievementsInput): EvaluateAchievementsResult {
  // Aggregate real activity metrics
  const focusSessions = sessionHistory.filter((s) => s.mode === 'focus');
  const totalFocusSessionsCount = focusSessions.length;

  const totalFocusMinutes = Math.floor(
    focusSessions.reduce((acc, s) => acc + s.durationMs, 0) / 60000
  );

  const completedTasksCount = tasks.filter((t) => t.completed).length;

  const completedPlannedTasksCount = plannerTasks.filter((p) => p.completed).length;

  const maxHabitStreak = habits.reduce((max, h) => {
    const s = h.streak ? Math.max(h.streak.currentStreak, h.streak.longestStreak) : 0;
    return Math.max(max, s);
  }, 0);

  // Check daily target reached today or on any recorded calendar day in session history
  let hasReachedDailyTarget = false;
  if (todayStats.totalFocusMinutes >= dailyGoals.targetFocusMinutes && dailyGoals.targetFocusMinutes > 0) {
    hasReachedDailyTarget = true;
  } else {
    // Check historical days in session history
    const dailyMinutesMap = new Map<string, number>();
    for (const session of focusSessions) {
      if (session.localDate) {
        const cur = dailyMinutesMap.get(session.localDate) || 0;
        const added = cur + Math.floor(session.durationMs / 60000);
        dailyMinutesMap.set(session.localDate, added);
        if (added >= dailyGoals.targetFocusMinutes && dailyGoals.targetFocusMinutes > 0) {
          hasReachedDailyTarget = true;
          break;
        }
      }
    }
  }

  const updatedUnlockedMap = { ...savedUnlockedMap };
  let hasNewUnlock = false;

  const achievements: AchievementProgress[] = ACHIEVEMENT_DEFINITIONS.map((def) => {
    let currentValue: number;

    switch (def.id) {
      case 'first_focus_session':
      case 'five_focus_sessions':
      case 'ten_focus_sessions':
        currentValue = totalFocusSessionsCount;
        break;
      case 'daily_focus_target_reached':
        currentValue = hasReachedDailyTarget ? 1 : 0;
        break;
      case 'seven_day_habit_streak':
        currentValue = maxHabitStreak;
        break;
      case 'hundred_focus_minutes':
        currentValue = totalFocusMinutes;
        break;
      case 'first_task_completed':
      case 'five_tasks_completed':
        currentValue = completedTasksCount;
        break;
      case 'planner_task_completed':
        currentValue = completedPlannedTasksCount;
        break;
      default:
        currentValue = 0;
    }

    const eligible = currentValue >= def.targetValue;
    const previouslyUnlockedAt = updatedUnlockedMap[def.id];

    let isUnlocked = false;
    let unlockedAt: number | null = null;

    if (previouslyUnlockedAt) {
      isUnlocked = true;
      unlockedAt = previouslyUnlockedAt;
    } else if (eligible) {
      isUnlocked = true;
      unlockedAt = Date.now();
      updatedUnlockedMap[def.id] = unlockedAt;
      hasNewUnlock = true;
    }

    const progressPercent = def.targetValue > 0
      ? Math.min(100, Math.round((currentValue / def.targetValue) * 100))
      : 0;

    return {
      ...def,
      currentValue: Math.min(currentValue, def.targetValue),
      progressPercent: isUnlocked ? 100 : progressPercent,
      isUnlocked,
      unlockedAt,
    };
  });

  return {
    achievements,
    updatedUnlockedMap,
    hasNewUnlock,
  };
}

/**
 * Calculates daily progress items for minutes, sessions, and optional tasks.
 */
export function calculateDailyGoalsProgress(
  goals: DailyGoalsConfig,
  todayStats: DailyProductivityStats
): DailyGoalProgressItem[] {
  const minutesCurrent = todayStats.totalFocusMinutes;
  const minutesTarget = goals.targetFocusMinutes;
  const minutesRemaining = Math.max(0, minutesTarget - minutesCurrent);
  const minutesPercent = minutesTarget > 0
    ? Math.min(100, Math.round((minutesCurrent / minutesTarget) * 100))
    : 100;

  const sessionsCurrent = todayStats.completedFocusSessions;
  const sessionsTarget = goals.targetFocusSessions;
  const sessionsRemaining = Math.max(0, sessionsTarget - sessionsCurrent);
  const sessionsPercent = sessionsTarget > 0
    ? Math.min(100, Math.round((sessionsCurrent / sessionsTarget) * 100))
    : 100;

  const tasksCurrent = todayStats.completedTasks;
  const tasksTarget = goals.targetCompletedTasks;
  const tasksRemaining = Math.max(0, tasksTarget - tasksCurrent);
  const tasksPercent = tasksTarget > 0
    ? Math.min(100, Math.round((tasksCurrent / tasksTarget) * 100))
    : 100;

  return [
    {
      id: 'minutes',
      title: 'Daily Focus Time',
      current: minutesCurrent,
      target: minutesTarget,
      remaining: minutesRemaining,
      percent: minutesPercent,
      isCompleted: minutesCurrent >= minutesTarget,
      unit: 'min',
      enabled: true,
    },
    {
      id: 'sessions',
      title: 'Focus Sessions',
      current: sessionsCurrent,
      target: sessionsTarget,
      remaining: sessionsRemaining,
      percent: sessionsPercent,
      isCompleted: sessionsCurrent >= sessionsTarget,
      unit: 'sessions',
      enabled: true,
    },
    {
      id: 'tasks',
      title: 'Completed Tasks',
      current: tasksCurrent,
      target: tasksTarget,
      remaining: tasksRemaining,
      percent: tasksPercent,
      isCompleted: tasksCurrent >= tasksTarget,
      unit: 'tasks',
      enabled: goals.tasksGoalEnabled,
    },
  ];
}
