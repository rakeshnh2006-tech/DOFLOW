import type { CompletedSessionRecord, DailyProductivityStats } from '../types/stats';
import type { DailyGoalsConfig } from '../types/goals';
import type { Task } from '../types/task';
import type { PlannedTask } from '../types/planner';
import type { UserPreferences } from '../types/settings';
import type {
  AdaptiveDurationSuggestion,
  FlowScoreBreakdown,
  PersonalProductivityInsights,
  PeakTimeWindow,
  SessionReflection,
  TaskPriority,
  TaskRecommendation,
} from '../types/intelligence';

// ============================================================================
// 1. Transparent Flow Score Calculator
// ============================================================================

export interface CalculateFlowScoreOptions {
  todayStats: DailyProductivityStats;
  dailyGoals: DailyGoalsConfig;
  todayPlannedTasks: PlannedTask[];
  todayReflections: SessionReflection[];
}

/**
 * Calculates today's transparent Flow Score out of 100 with clear component breakdown.
 */
export function calculateFlowScore({
  todayStats,
  dailyGoals,
  todayPlannedTasks,
  todayReflections,
}: CalculateFlowScoreOptions): FlowScoreBreakdown {
  // 1. Focus Time Score (Max 40 points)
  const targetFocusMinutes = Math.max(dailyGoals.targetFocusMinutes || 60, 1);
  const actualFocusMinutes = Math.max(todayStats.totalFocusMinutes || 0, 0);
  const focusRatio = Math.min(actualFocusMinutes / targetFocusMinutes, 1.0);
  const focusEarned = Math.round(focusRatio * 40);

  // 2. Task Completion Score (Max 35 points)
  let targetTaskCount: number;
  let completedTaskCount: number;

  if (todayPlannedTasks.length > 0) {
    targetTaskCount = todayPlannedTasks.length;
    completedTaskCount = todayPlannedTasks.filter((t) => t.completed).length;
  } else if (dailyGoals.tasksGoalEnabled && dailyGoals.targetCompletedTasks > 0) {
    targetTaskCount = dailyGoals.targetCompletedTasks;
    completedTaskCount = Math.max(todayStats.completedTasks || 0, 0);
  } else {
    // Default sensible daily task threshold
    targetTaskCount = 3;
    completedTaskCount = Math.max(todayStats.completedTasks || 0, 0);
  }

  const taskRatio = targetTaskCount > 0 ? Math.min(completedTaskCount / targetTaskCount, 1.0) : 0;
  const taskEarned = Math.round(taskRatio * 35);

  // 3. Session Consistency Score (Max 25 points)
  const targetSessions = Math.max(dailyGoals.targetFocusSessions || 4, 1);
  const actualSessions = Math.max(todayStats.completedFocusSessions || 0, 0);
  const sessionRatio = Math.min(actualSessions / targetSessions, 1.0);
  const baseSessionScore = Math.round(sessionRatio * 20); // Up to 20 pts

  // Quality consistency bonus (Up to 5 pts)
  let qualityBonus: number;
  if (todayReflections.length > 0) {
    const productiveCount = todayReflections.filter((r) => r.quality === 'productive').length;
    qualityBonus = Math.round((productiveCount / todayReflections.length) * 5);
  } else {
    // If no reflections logged yet, award proportional bonus based on session progress
    qualityBonus = Math.round(sessionRatio * 5);
  }

  const consistencyEarned = Math.min(baseSessionScore + qualityBonus, 25);

  // Total Score (0 - 100)
  const totalScore = Math.min(Math.max(focusEarned + taskEarned + consistencyEarned, 0), 100);

  return {
    totalScore,
    focusTime: {
      earned: focusEarned,
      max: 40,
      percentage: Math.round(focusRatio * 100),
      label: 'Focus Time',
      description: `${actualFocusMinutes} of ${targetFocusMinutes} min target completed`,
    },
    taskCompletion: {
      earned: taskEarned,
      max: 35,
      percentage: Math.round(taskRatio * 100),
      label: 'Task Completion',
      description: `${completedTaskCount} of ${targetTaskCount} planned tasks completed`,
    },
    sessionConsistency: {
      earned: consistencyEarned,
      max: 25,
      percentage: Math.round(((baseSessionScore + qualityBonus) / 25) * 100),
      label: 'Session Consistency',
      description: `${actualSessions} of ${targetSessions} sessions completed (${qualityBonus}/5 quality bonus)`,
    },
    disclaimer:
      'Flow Score is an objective, transparent daily productivity heuristic based exclusively on your configured daily targets and completed activity. It is not a scientific or psychological measurement.',
  };
}

// ============================================================================
// 2. Intelligent Task Recommendation Engine
// ============================================================================

export interface RankTaskRecommendationsOptions {
  tasks: Task[];
  plannedTasks: PlannedTask[];
  activeTaskId: string | null;
  dismissedTaskIds?: string[];
  currentTimeStr?: string; // 'HH:MM'
}

/**
 * Ranks incomplete tasks using user priority, deadline urgency, daily planner flags, and active goal status.
 */
export function rankTaskRecommendations({
  tasks,
  plannedTasks,
  activeTaskId,
  dismissedTaskIds = [],
  currentTimeStr,
}: RankTaskRecommendationsOptions): TaskRecommendation[] {
  // Find current time formatted as HH:MM if not supplied
  const now = new Date();
  const currentHHMM =
    currentTimeStr ??
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Filter to incomplete, un-dismissed tasks
  const eligibleTasks = tasks.filter((t) => !t.completed && !dismissedTaskIds.includes(t.id));

  if (eligibleTasks.length === 0) {
    return [];
  }

  const recommendations: TaskRecommendation[] = eligibleTasks.map((task) => {
    // Find matching planned task if scheduled
    const planned = plannedTasks.find((p) => p.id === task.id);

    let score = 0;
    const reasons: string[] = [];
    let isOverdue = false;
    let priority: TaskPriority = 'medium';

    if (planned) {
      priority = planned.priority;

      // 1. Today's Top Priority (+50 pts)
      if (planned.isTodayPriority) {
        score += 50;
        reasons.push("Marked as Today's Top Priority");
      }

      // 2. Priority weight (+10 to +30 pts)
      if (planned.priority === 'high') {
        score += 30;
        reasons.push('High priority');
      } else if (planned.priority === 'medium') {
        score += 18;
      } else if (planned.priority === 'low') {
        score += 8;
      }

      // 3. Deadline urgency
      if (planned.deadline) {
        if (currentHHMM > planned.deadline) {
          isOverdue = true;
          score += 40;
          reasons.push(`Overdue (deadline was ${planned.deadline})`);
        } else {
          score += 25;
          reasons.push(`Due today at ${planned.deadline}`);
        }
      }

      // 4. Start time scheduled
      if (planned.startTime && currentHHMM >= planned.startTime) {
        score += 15;
        if (!planned.deadline) {
          reasons.push(`Scheduled start time was ${planned.startTime}`);
        }
      }
    } else {
      // Unscheduled task
      score += 15;
    }

    // 5. Currently selected active focus goal (+20 pts)
    if (task.id === activeTaskId) {
      score += 20;
      reasons.push('Currently chosen as active focus goal');
    }

    // Default reason fallback
    const primaryReason =
      reasons.length > 0
        ? reasons.join(' • ')
        : 'Next available task ready for focus';

    return {
      task,
      priority,
      score,
      reason: primaryReason,
      isTodayPriority: planned?.isTodayPriority,
      deadline: planned?.deadline,
      startTime: planned?.startTime,
      isOverdue,
    };
  });

  // Sort descending by calculated score
  return recommendations.sort((a, b) => b.score - a.score);
}

// ============================================================================
// 3. Personal Productivity Insights Analyzer
// ============================================================================

export interface GeneratePersonalInsightsOptions {
  sessionHistory: CompletedSessionRecord[];
  reflections: SessionReflection[];
}

/**
 * Analyzes historical records to find time-of-day focus patterns, average session length, and quality correlation.
 */
export function generatePersonalInsights({
  sessionHistory,
  reflections,
}: GeneratePersonalInsightsOptions): PersonalProductivityInsights {
  // Only evaluate focus sessions (breaks excluded)
  const focusSessions = sessionHistory.filter((s) => s.mode === 'focus');
  const totalSessionsCount = focusSessions.length;

  // 1. Peak Time of Day Analysis
  const windowsConfig = [
    { name: 'Morning' as const, range: '05:00 – 11:59', minHour: 5, maxHour: 11 },
    { name: 'Afternoon' as const, range: '12:00 – 16:59', minHour: 12, maxHour: 16 },
    { name: 'Evening' as const, range: '17:00 – 21:59', minHour: 17, maxHour: 21 },
    { name: 'Night' as const, range: '22:00 – 04:59', minHour: 22, maxHour: 4 },
  ];

  const windowMinutesMap: Record<'Morning' | 'Afternoon' | 'Evening' | 'Night', { minutes: number; count: number }> = {
    Morning: { minutes: 0, count: 0 },
    Afternoon: { minutes: 0, count: 0 },
    Evening: { minutes: 0, count: 0 },
    Night: { minutes: 0, count: 0 },
  };

  let totalRecordedMinutes = 0;

  for (const session of focusSessions) {
    const d = new Date(session.completedAt);
    const hour = d.getHours();
    const durationMinutes = Math.round(session.durationMs / 60000);
    totalRecordedMinutes += durationMinutes;

    if (hour >= 5 && hour < 12) {
      windowMinutesMap.Morning.minutes += durationMinutes;
      windowMinutesMap.Morning.count += 1;
    } else if (hour >= 12 && hour < 17) {
      windowMinutesMap.Afternoon.minutes += durationMinutes;
      windowMinutesMap.Afternoon.count += 1;
    } else if (hour >= 17 && hour < 22) {
      windowMinutesMap.Evening.minutes += durationMinutes;
      windowMinutesMap.Evening.count += 1;
    } else {
      windowMinutesMap.Night.minutes += durationMinutes;
      windowMinutesMap.Night.count += 1;
    }
  }

  const allWindows: PeakTimeWindow[] = windowsConfig.map((w) => {
    const data = windowMinutesMap[w.name];
    const percentage = totalRecordedMinutes > 0 ? Math.round((data.minutes / totalRecordedMinutes) * 100) : 0;
    return {
      windowName: w.name,
      timeRange: w.range,
      focusMinutes: data.minutes,
      percentage,
      sessionCount: data.count,
    };
  });

  const isPeakSufficient = totalSessionsCount >= 3;
  let bestWindow: PeakTimeWindow | null = null;
  let peakSummary = 'Insufficient data: Complete at least 3 focus sessions to identify your peak focus time of day.';

  if (isPeakSufficient && totalRecordedMinutes > 0) {
    // Sort by focus minutes descending
    const sorted = [...allWindows].sort((a, b) => b.focusMinutes - a.focusMinutes);
    bestWindow = sorted[0];
    peakSummary = `Your peak focus window is ${bestWindow.windowName} (${bestWindow.timeRange}), accounting for ${bestWindow.percentage}% of your recorded focus time (${bestWindow.focusMinutes} min across ${bestWindow.sessionCount} sessions).`;
  }

  // 2. Average Session Duration
  const isDurationSufficient = totalSessionsCount >= 2;
  const averageMinutes =
    isDurationSufficient && totalSessionsCount > 0
      ? Math.round(totalRecordedMinutes / totalSessionsCount)
      : 0;

  const durationSummary = isDurationSufficient
    ? `Your average completed focus sprint is ${averageMinutes} minutes across ${totalSessionsCount} recorded sessions.`
    : 'Insufficient data: Complete at least 2 focus sessions to calculate your average focus sprint length.';

  // 3. Session Quality Analysis
  const totalReflections = reflections.length;
  const isQualitySufficient = totalReflections >= 3;

  const productiveCount = reflections.filter((r) => r.quality === 'productive').length;
  const distractedCount = reflections.filter((r) => r.quality === 'distracted').length;
  const interruptedCount = reflections.filter((r) => r.quality === 'interrupted').length;
  const productivePercentage =
    totalReflections > 0 ? Math.round((productiveCount / totalReflections) * 100) : 0;

  let qualitySummary =
    'Insufficient data: Log at least 3 session reflections to view focus quality patterns.';

  if (isQualitySufficient) {
    if (productivePercentage >= 70) {
      qualitySummary = `${productivePercentage}% of your reflections report productive flow with minimal friction. (${productiveCount} productive out of ${totalReflections} total).`;
    } else if (distractedCount >= interruptedCount) {
      qualitySummary = `${distractedCount} of ${totalReflections} reflections noted distractions. Consider closing secondary tabs or shortening sprints to sustain focus.`;
    } else {
      qualitySummary = `${interruptedCount} of ${totalReflections} reflections noted interruptions. Consider setting status boundaries during focus blocks.`;
    }
  }

  return {
    peakTimeOfDay: {
      bestWindow,
      allWindows,
      isSufficient: isPeakSufficient,
      minimumNeeded: 3,
      currentSessionsCount: totalSessionsCount,
      summary: peakSummary,
    },
    averageDuration: {
      averageMinutes,
      totalSessionsCount,
      isSufficient: isDurationSufficient,
      minimumNeeded: 2,
      summary: durationSummary,
    },
    sessionQuality: {
      productiveCount,
      distractedCount,
      interruptedCount,
      totalReflections,
      productivePercentage,
      isSufficient: isQualitySufficient,
      minimumNeeded: 3,
      summary: qualitySummary,
    },
  };
}

// ============================================================================
// 4. Adaptive Duration Suggestions
// ============================================================================

export interface GenerateAdaptiveSuggestionsOptions {
  sessionHistory: CompletedSessionRecord[];
  reflections: SessionReflection[];
  currentPreferences: UserPreferences;
}

/**
 * Produces explainable, optional focus/break duration suggestions based on evidence.
 */
export function generateAdaptiveSuggestions({
  sessionHistory,
  reflections,
  currentPreferences,
}: GenerateAdaptiveSuggestionsOptions): AdaptiveDurationSuggestion {
  const focusSessions = sessionHistory.filter((s) => s.mode === 'focus');
  const hasSufficientEvidence = focusSessions.length >= 3;

  // Baseline when evidence is limited
  if (!hasSufficientEvidence) {
    return {
      focusDurationMinutes: currentPreferences.focusDurationMinutes,
      shortBreakDurationMinutes: currentPreferences.shortBreakDurationMinutes,
      longBreakDurationMinutes: currentPreferences.longBreakDurationMinutes,
      reason:
        'Evidence is limited. Initial suggestion reflects your current configured preferences. Complete 3 or more focus sessions with reflections for personalized adaptations.',
      evidenceLevel: 'limited',
      isDifferentFromCurrent: false,
    };
  }

  // Sufficient evidence: analyze reflections and session durations
  const totalReflections = reflections.length;
  const distractedOrInterrupted = reflections.filter(
    (r) => r.quality === 'distracted' || r.quality === 'interrupted'
  ).length;

  let suggestedFocus: number;
  let suggestedShortBreak: number;
  const suggestedLongBreak = 15;
  let reason: string;

  // Case A: High friction / distractions on longer sessions
  if (totalReflections >= 3 && distractedOrInterrupted / totalReflections > 0.4) {
    suggestedFocus = 20;
    suggestedShortBreak = 5;
    reason =
      'Reflections indicate frequent distractions or interruptions. A tighter 20-minute focus sprint helps maintain uninterrupted flow and lower fatigue.';
  }
  // Case B: High flow / high productivity
  else if (totalReflections >= 3 && reflections.filter((r) => r.quality === 'productive').length / totalReflections >= 0.75) {
    // If user already enjoys 25m, suggest deepening to 30m if preferred
    if (currentPreferences.focusDurationMinutes === 25) {
      suggestedFocus = 30;
      suggestedShortBreak = 6;
      reason =
        'You consistently report productive flow on 25-minute sprints. Extending to 30 minutes with a 6-minute restorative break can deepen your focus capacity.';
    } else {
      suggestedFocus = currentPreferences.focusDurationMinutes;
      suggestedShortBreak = currentPreferences.shortBreakDurationMinutes;
      reason = `Your current ${currentPreferences.focusDurationMinutes}-minute focus duration is well-aligned with your productive reflection ratings.`;
    }
  }
  // Case C: Steady standard Pomodoro pattern
  else {
    suggestedFocus = 25;
    suggestedShortBreak = 5;
    reason =
      'Recorded activity indicates steady progress with classic 25-minute focus intervals and 5-minute restorative breaks.';
  }

  const isDifferentFromCurrent =
    suggestedFocus !== currentPreferences.focusDurationMinutes ||
    suggestedShortBreak !== currentPreferences.shortBreakDurationMinutes ||
    suggestedLongBreak !== currentPreferences.longBreakDurationMinutes;

  return {
    focusDurationMinutes: suggestedFocus,
    shortBreakDurationMinutes: suggestedShortBreak,
    longBreakDurationMinutes: suggestedLongBreak,
    reason,
    evidenceLevel: 'sufficient',
    isDifferentFromCurrent,
  };
}
