export interface DailyGoalsConfig {
  targetFocusMinutes: number; // e.g. 60
  targetFocusSessions: number; // e.g. 4
  tasksGoalEnabled: boolean; // e.g. true
  targetCompletedTasks: number; // e.g. 3
}

export interface DailyGoalProgressItem {
  id: 'minutes' | 'sessions' | 'tasks';
  title: string;
  current: number;
  target: number;
  remaining: number;
  percent: number;
  isCompleted: boolean;
  unit: string;
  enabled: boolean;
}

export type AchievementCategory = 'focus' | 'habits' | 'tasks' | 'goals';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  targetValue: number;
  unit: string;
}

export interface UnlockedAchievementRecord {
  id: string;
  unlockedAt: number; // timestamp
}

export interface AchievementProgress extends AchievementDefinition {
  currentValue: number;
  progressPercent: number;
  isUnlocked: boolean;
  unlockedAt: number | null; // formatted date or null
}

export type AchievementFilter = 'all' | 'unlocked' | 'locked';
