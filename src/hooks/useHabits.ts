import { useCallback, useMemo, useState } from 'react';
import type {
  Habit,
  HabitCompletion,
  HabitFilter,
  HabitInput,
  HabitPeriod,
  HabitWithStreak,
  OverallHabitSummary,
} from '../types/habit';
import {
  loadHabitCompletionsFromStorage,
  loadHabitsFromStorage,
  saveHabitCompletionsToStorage,
  saveHabitsToStorage,
} from '../utils/habitStorage';
import { calculateHabitStreak, isHabitScheduledOnDate } from '../utils/streakUtils';
import { getLocalDateString } from '../utils/statsStorage';

export interface UseHabitsReturn {
  habits: Habit[];
  completions: HabitCompletion[];
  habitsWithStreaks: HabitWithStreak[];
  filteredHabits: HabitWithStreak[];
  todayHabits: HabitWithStreak[];
  overallSummary: OverallHabitSummary;
  filter: HabitFilter;
  period: HabitPeriod;
  errorMessage: string | null;
  setFilter: (filter: HabitFilter) => void;
  setPeriod: (period: HabitPeriod) => void;
  createHabit: (input: HabitInput) => boolean;
  updateHabit: (id: string, input: HabitInput) => boolean;
  toggleArchiveHabit: (id: string) => void;
  deleteHabit: (id: string) => void;
  toggleHabitCompletion: (habitId: string, targetDateStr?: string) => void;
  clearError: () => void;
}

export function useHabits(): UseHabitsReturn {
  const [habits, setHabits] = useState<Habit[]>(() => loadHabitsFromStorage());
  const [completions, setCompletions] = useState<HabitCompletion[]>(() =>
    loadHabitCompletionsFromStorage()
  );
  const [filter, setFilter] = useState<HabitFilter>('active');
  const [period, setPeriod] = useState<HabitPeriod>('30days');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => setErrorMessage(null), []);

  const todayStr = useMemo(() => getLocalDateString(), []);

  // Compute streaks for all habits in real time from completion records
  const habitsWithStreaks = useMemo<HabitWithStreak[]>(() => {
    return habits.map((h) => {
      const streak = calculateHabitStreak({
        habit: h,
        completions,
        referenceDateStr: todayStr,
        period,
      });
      return {
        ...h,
        streak,
      };
    });
  }, [habits, completions, todayStr, period]);

  // Filtered habits according to active/archived/all filter
  const filteredHabits = useMemo(() => {
    if (filter === 'active') {
      return habitsWithStreaks.filter((h) => !h.archived);
    }
    if (filter === 'archived') {
      return habitsWithStreaks.filter((h) => h.archived);
    }
    return habitsWithStreaks;
  }, [habitsWithStreaks, filter]);

  // Today's scheduled active habits
  const todayHabits = useMemo(() => {
    return habitsWithStreaks.filter(
      (h) => !h.archived && isHabitScheduledOnDate(h, todayStr)
    );
  }, [habitsWithStreaks, todayStr]);

  // Overall completion metrics
  const overallSummary = useMemo<OverallHabitSummary>(() => {
    const active = habitsWithStreaks.filter((h) => !h.archived);
    const scheduledToday = active.filter((h) => h.streak.isScheduledToday);
    const completedToday = scheduledToday.filter((h) => h.streak.isCompletedToday).length;
    const remainingToday = Math.max(0, scheduledToday.length - completedToday);

    const totalRate = active.reduce((acc, h) => acc + h.streak.completionRatePercent, 0);
    const overallRatePercent = active.length > 0 ? Math.round(totalRate / active.length) : 0;

    return {
      totalActive: active.length,
      scheduledToday: scheduledToday.length,
      completedToday,
      remainingToday,
      overallRatePercent,
    };
  }, [habitsWithStreaks]);

  // 1. Create a Habit
  const createHabit = useCallback((input: HabitInput): boolean => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      setErrorMessage('Please enter a habit name. Habit name cannot be empty.');
      return false;
    }

    if (input.frequency === 'custom' && (!input.customDays || input.customDays.length === 0)) {
      setErrorMessage('Please select at least one day of the week for custom schedule.');
      return false;
    }

    const newHabit: Habit = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `habit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      description: input.description?.trim() || undefined,
      frequency: input.frequency,
      customDays: input.frequency === 'custom' ? input.customDays : undefined,
      createdAt: Date.now(),
      archived: false,
    };

    setHabits((prev) => {
      const updated = [newHabit, ...prev];
      saveHabitsToStorage(updated);
      return updated;
    });

    setErrorMessage(null);
    return true;
  }, []);

  // 2. Update an existing Habit
  const updateHabit = useCallback((id: string, input: HabitInput): boolean => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      setErrorMessage('Habit name cannot be empty.');
      return false;
    }

    if (input.frequency === 'custom' && (!input.customDays || input.customDays.length === 0)) {
      setErrorMessage('Please select at least one day for custom schedule.');
      return false;
    }

    setHabits((prev) => {
      const updated = prev.map((h) => {
        if (h.id === id) {
          return {
            ...h,
            name: trimmedName,
            description: input.description?.trim() || undefined,
            frequency: input.frequency,
            customDays: input.frequency === 'custom' ? input.customDays : undefined,
          };
        }
        return h;
      });
      saveHabitsToStorage(updated);
      return updated;
    });

    setErrorMessage(null);
    return true;
  }, []);

  // 3. Toggle Archive
  const toggleArchiveHabit = useCallback((id: string) => {
    setHabits((prev) => {
      const updated = prev.map((h) => {
        if (h.id === id) {
          const nextArchived = !h.archived;
          return {
            ...h,
            archived: nextArchived,
            archivedAt: nextArchived ? Date.now() : undefined,
          };
        }
        return h;
      });
      saveHabitsToStorage(updated);
      return updated;
    });
  }, []);

  // 4. Delete Habit
  const deleteHabit = useCallback((id: string) => {
    setHabits((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      saveHabitsToStorage(updated);
      return updated;
    });

    // Also clean up completions for this habit
    setCompletions((prev) => {
      const updated = prev.filter((c) => c.habitId !== id);
      saveHabitCompletionsToStorage(updated);
      return updated;
    });
  }, []);

  // 5. Toggle Completion (Mark complete / Undo)
  const toggleHabitCompletion = useCallback(
    (habitId: string, targetDateStr?: string) => {
      const dateKey = targetDateStr || getLocalDateString();

      setCompletions((prev) => {
        const existingIdx = prev.findIndex(
          (c) => c.habitId === habitId && c.date === dateKey
        );

        let updated: HabitCompletion[];
        if (existingIdx >= 0) {
          // Undo completion
          updated = prev.filter((_, idx) => idx !== existingIdx);
        } else {
          // Mark completed (guaranteed unique by habitId + dateKey)
          const newRecord: HabitCompletion = {
            id:
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            habitId,
            date: dateKey,
            completedAt: Date.now(),
          };
          updated = [newRecord, ...prev];
        }

        saveHabitCompletionsToStorage(updated);
        return updated;
      });
    },
    []
  );

  return {
    habits,
    completions,
    habitsWithStreaks,
    filteredHabits,
    todayHabits,
    overallSummary,
    filter,
    period,
    errorMessage,
    setFilter,
    setPeriod,
    createHabit,
    updateHabit,
    toggleArchiveHabit,
    deleteHabit,
    toggleHabitCompletion,
    clearError,
  };
}
