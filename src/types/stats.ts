import type { TimerMode } from './timer';

export interface CompletedSessionRecord {
  id: string;
  mode: TimerMode;
  durationMs: number;
  completedAt: number; // Date.now() timestamp
  localDate: string; // 'YYYY-MM-DD' formatted in user's local timezone
}

export interface DailyProductivityStats {
  date: string; // 'YYYY-MM-DD'
  completedFocusSessions: number;
  totalFocusMs: number;
  totalFocusMinutes: number;
  completedTasks: number;
  hasActivity: boolean;
}
