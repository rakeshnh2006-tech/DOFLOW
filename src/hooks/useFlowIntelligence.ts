import { useCallback, useMemo, useState } from 'react';
import type { CompletedSessionRecord, DailyProductivityStats } from '../types/stats';
import type { DailyGoalsConfig } from '../types/goals';
import type { Task } from '../types/task';
import type { PlannedTask } from '../types/planner';
import type { UserPreferences } from '../types/settings';
import type {
  AdaptiveDurationSuggestion,
  FlowScoreBreakdown,
  PersonalProductivityInsights,
  SessionQuality,
  SessionReflection,
  TaskRecommendation,
} from '../types/intelligence';
import {
  loadReflectionsFromStorage,
  saveSessionReflection,
} from '../utils/reflectionStorage';
import {
  calculateFlowScore,
  generateAdaptiveSuggestions,
  generatePersonalInsights,
  rankTaskRecommendations,
} from '../utils/flowIntelligenceEvaluator';

export interface UseFlowIntelligenceOptions {
  sessionHistory: CompletedSessionRecord[];
  todayStats: DailyProductivityStats;
  tasks: Task[];
  plannedTasks: PlannedTask[];
  dailyGoals: DailyGoalsConfig;
  currentPreferences: UserPreferences;
  activeTaskId: string | null;
  onSelectActiveTask?: (id: string) => void;
  onApplyDurations?: (focusMins: number, shortBreakMins: number, longBreakMins: number) => void;
}

export interface UseFlowIntelligenceReturn {
  reflections: SessionReflection[];
  flowScore: FlowScoreBreakdown;
  taskRecommendations: TaskRecommendation[];
  primaryRecommendation: TaskRecommendation | null;
  personalInsights: PersonalProductivityInsights;
  adaptiveSuggestion: AdaptiveDurationSuggestion;
  dismissedTaskIds: string[];
  pendingReflectionSessionId: string | null;
  isReflectionModalOpen: boolean;
  addReflection: (sessionId: string, quality: SessionQuality, note?: string) => void;
  dismissRecommendation: (taskId: string) => void;
  resetDismissals: () => void;
  applyAdaptiveSuggestion: () => void;
  promptSessionReflection: (sessionId: string) => void;
  skipSessionReflection: () => void;
}

export function useFlowIntelligence({
  sessionHistory,
  todayStats,
  tasks,
  plannedTasks,
  dailyGoals,
  currentPreferences,
  activeTaskId,
  onApplyDurations,
}: UseFlowIntelligenceOptions): UseFlowIntelligenceReturn {
  // 1. Session reflections state
  const [reflections, setReflections] = useState<SessionReflection[]>(() =>
    loadReflectionsFromStorage()
  );

  // 2. Dismissed recommendations state (resets when all tasks dismissed or user resets)
  const [dismissedTaskIds, setDismissedTaskIds] = useState<string[]>([]);

  // 3. Pending session reflection modal state
  const [pendingReflectionSessionId, setPendingReflectionSessionId] = useState<string | null>(null);

  // Filter today's planned tasks and reflections
  const todayPlannedTasks = useMemo(() => {
    return plannedTasks.filter((p) => p.date === todayStats.date);
  }, [plannedTasks, todayStats.date]);

  const todayReflections = useMemo(() => {
    return reflections.filter((r) => r.localDate === todayStats.date);
  }, [reflections, todayStats.date]);

  // 4. Calculate Flow Score
  const flowScore = useMemo(() => {
    return calculateFlowScore({
      todayStats,
      dailyGoals,
      todayPlannedTasks,
      todayReflections,
    });
  }, [todayStats, dailyGoals, todayPlannedTasks, todayReflections]);

  // 5. Calculate Task Recommendations
  const taskRecommendations = useMemo(() => {
    return rankTaskRecommendations({
      tasks,
      plannedTasks: todayPlannedTasks,
      activeTaskId,
      dismissedTaskIds,
    });
  }, [tasks, todayPlannedTasks, activeTaskId, dismissedTaskIds]);

  const primaryRecommendation = taskRecommendations.length > 0 ? taskRecommendations[0] : null;

  // 6. Generate Personal Insights
  const personalInsights = useMemo(() => {
    return generatePersonalInsights({
      sessionHistory,
      reflections,
    });
  }, [sessionHistory, reflections]);

  // 7. Generate Adaptive Duration Suggestions
  const adaptiveSuggestion = useMemo(() => {
    return generateAdaptiveSuggestions({
      sessionHistory,
      reflections,
      currentPreferences,
    });
  }, [sessionHistory, reflections, currentPreferences]);

  // 8. Add/Save a session reflection
  const addReflection = useCallback(
    (sessionId: string, quality: SessionQuality, note?: string) => {
      const now = Date.now();
      const reflection: SessionReflection = {
        sessionId,
        completedAt: now,
        localDate: todayStats.date,
        quality,
        note: note?.trim() ? note.trim() : undefined,
      };

      const updated = saveSessionReflection(reflection);
      setReflections(updated);
      setPendingReflectionSessionId(null);
    },
    [todayStats.date]
  );

  // 9. Recommendation dismiss & reset handlers
  const dismissRecommendation = useCallback((taskId: string) => {
    setDismissedTaskIds((prev) => [...prev, taskId]);
  }, []);

  const resetDismissals = useCallback(() => {
    setDismissedTaskIds([]);
  }, []);

  // 10. Apply adaptive duration suggestions
  const applyAdaptiveSuggestion = useCallback(() => {
    if (onApplyDurations) {
      onApplyDurations(
        adaptiveSuggestion.focusDurationMinutes,
        adaptiveSuggestion.shortBreakDurationMinutes,
        adaptiveSuggestion.longBreakDurationMinutes
      );
    }
  }, [adaptiveSuggestion, onApplyDurations]);

  // 11. Reflection modal helpers
  const promptSessionReflection = useCallback((sessionId: string) => {
    setPendingReflectionSessionId(sessionId);
  }, []);

  const skipSessionReflection = useCallback(() => {
    setPendingReflectionSessionId(null);
  }, []);

  return {
    reflections,
    flowScore,
    taskRecommendations,
    primaryRecommendation,
    personalInsights,
    adaptiveSuggestion,
    dismissedTaskIds,
    pendingReflectionSessionId,
    isReflectionModalOpen: pendingReflectionSessionId !== null,
    addReflection,
    dismissRecommendation,
    resetDismissals,
    applyAdaptiveSuggestion,
    promptSessionReflection,
    skipSessionReflection,
  };
}
