export type HabitFrequency = 'daily' | 'weekdays' | 'custom';

export type HabitFilter = 'active' | 'archived' | 'all';

export type HabitPeriod = '7days' | '30days' | 'month' | 'all';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency: HabitFrequency;
  customDays?: number[]; // [0..6] where 0=Sunday, 1=Monday, ..., 6=Saturday
  createdAt: number;
  archived: boolean;
  archivedAt?: number;
}

export interface HabitInput {
  name: string;
  description?: string;
  frequency: HabitFrequency;
  customDays?: number[];
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string; // 'YYYY-MM-DD' formatted in user's local timezone
  completedAt: number; // timestamp
}

export interface HabitStreak {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRatePercent: number;
  isCompletedToday: boolean;
  isScheduledToday: boolean;
}

export interface HabitWithStreak extends Habit {
  streak: HabitStreak;
}

export interface OverallHabitSummary {
  totalActive: number;
  scheduledToday: number;
  completedToday: number;
  remainingToday: number;
  overallRatePercent: number;
}
