import { useCallback, useMemo, useState } from 'react';
import type { Task } from '../types/task';
import type { TimerMode } from '../types/timer';
import type { CompletedSessionRecord, DailyProductivityStats } from '../types/stats';
import {
  getLocalDateString,
  loadSessionHistoryFromStorage,
  saveSessionHistoryToStorage,
} from '../utils/statsStorage';

export interface UseProductivityStatsOptions {
  tasks: Task[];
  initialHistory?: CompletedSessionRecord[];
}

export interface UseProductivityStatsReturn {
  sessionHistory: CompletedSessionRecord[];
  todayStats: DailyProductivityStats;
  getDailyStats: (dateString?: string) => DailyProductivityStats;
  recordCompletedSession: (mode: TimerMode, durationMs: number) => CompletedSessionRecord | undefined;
  clearHistory: () => void;
}

export function useProductivityStats({
  tasks,
  initialHistory,
}: UseProductivityStatsOptions): UseProductivityStatsReturn {
  const [sessionHistory, setSessionHistory] = useState<CompletedSessionRecord[]>(
    () => initialHistory ?? loadSessionHistoryFromStorage()
  );

  // Record a completed session (called strictly on timer reaching zero)
  const recordCompletedSession = useCallback((mode: TimerMode, durationMs: number): CompletedSessionRecord | undefined => {
    // Only record valid positive durations
    if (durationMs <= 0) return undefined;

    const completedAt = Date.now();
    const localDate = getLocalDateString(completedAt);

    const newRecord: CompletedSessionRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `session-${completedAt}-${Math.random().toString(36).slice(2, 7)}`,
      mode,
      durationMs,
      completedAt,
      localDate,
    };

    setSessionHistory((prevHistory) => {
      const updated = [newRecord, ...prevHistory];
      saveSessionHistoryToStorage(updated);
      return updated;
    });

    return newRecord;
  }, []);

  // Compute stats for any given local date string (defaults to today's local date)
  const getDailyStats = useCallback(
    (targetDate?: string): DailyProductivityStats => {
      const date = targetDate ?? getLocalDateString();

      // Filter only completed FOCUS sessions on that local date (exclude breaks!)
      const todayFocusSessions = sessionHistory.filter(
        (r) => r.localDate === date && r.mode === 'focus'
      );

      const completedFocusSessions = todayFocusSessions.length;
      const totalFocusMs = todayFocusSessions.reduce((acc, r) => acc + r.durationMs, 0);

      // Total focus minutes calculated accurately from actual milliseconds
      const totalFocusMinutes = Math.round(totalFocusMs / (60 * 1000));

      // Completed tasks derived from current saved task records
      const completedTasks = tasks.filter((t) => t.completed).length;

      return {
        date,
        completedFocusSessions,
        totalFocusMs,
        totalFocusMinutes,
        completedTasks,
        hasActivity: completedFocusSessions > 0 || completedTasks > 0,
      };
    },
    [sessionHistory, tasks]
  );

  const todayStats = useMemo(() => getDailyStats(), [getDailyStats]);

  const clearHistory = useCallback(() => {
    setSessionHistory([]);
    saveSessionHistoryToStorage([]);
  }, []);

  return {
    sessionHistory,
    todayStats,
    getDailyStats,
    recordCompletedSession,
    clearHistory,
  };
}
