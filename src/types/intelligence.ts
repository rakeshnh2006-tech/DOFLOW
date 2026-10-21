import type { Task } from './task';
import type { PlannerPriority } from './planner';

export type TaskPriority = PlannerPriority;
export type SessionQuality = 'productive' | 'distracted' | 'interrupted';

export interface SessionReflection {
  sessionId: string;
  completedAt: number;
  localDate: string; // 'YYYY-MM-DD'
  quality: SessionQuality;
  note?: string;
}

export interface FlowScoreComponent {
  earned: number;
  max: number;
  percentage: number;
  label: string;
  description: string;
}

export interface FlowScoreBreakdown {
  totalScore: number; // 0 - 100
  focusTime: FlowScoreComponent; // Max 40
  taskCompletion: FlowScoreComponent; // Max 35
  sessionConsistency: FlowScoreComponent; // Max 25
  disclaimer: string;
}

export interface TaskRecommendation {
  task: Task;
  priority: TaskPriority;
  score: number;
  reason: string;
  isTodayPriority?: boolean;
  deadline?: string;
  startTime?: string;
  isOverdue?: boolean;
}

export interface PeakTimeWindow {
  windowName: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  timeRange: string;
  focusMinutes: number;
  percentage: number;
  sessionCount: number;
}

export interface PersonalProductivityInsights {
  peakTimeOfDay: {
    bestWindow: PeakTimeWindow | null;
    allWindows: PeakTimeWindow[];
    isSufficient: boolean;
    minimumNeeded: number;
    currentSessionsCount: number;
    summary: string;
  };
  averageDuration: {
    averageMinutes: number;
    totalSessionsCount: number;
    isSufficient: boolean;
    minimumNeeded: number;
    summary: string;
  };
  sessionQuality: {
    productiveCount: number;
    distractedCount: number;
    interruptedCount: number;
    totalReflections: number;
    productivePercentage: number;
    isSufficient: boolean;
    minimumNeeded: number;
    summary: string;
  };
}

export interface AdaptiveDurationSuggestion {
  focusDurationMinutes: number;
  shortBreakDurationMinutes: number;
  longBreakDurationMinutes: number;
  reason: string;
  evidenceLevel: 'limited' | 'sufficient';
  isDifferentFromCurrent: boolean;
}
