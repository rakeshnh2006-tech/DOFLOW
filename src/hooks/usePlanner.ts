import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Task } from '../types/task';
import type {
  PlannedTask,
  PlannedTaskInput,
  PlannerFilter,
  PlannerPriority,
  PlannerSummary,
} from '../types/planner';
import {
  isValidTimeFormat,
  loadPlannedTasksFromStorage,
  savePlannedTasksToStorage,
} from '../utils/plannerStorage';
import { getLocalDateString } from '../utils/statsStorage';

export interface UsePlannerOptions {
  tasks: Task[];
  activeTaskId: string | null;
  addTask: (title: string, customId?: string) => boolean;
  updateTaskTitle?: (id: string, newTitle: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  selectActiveTask: (id: string | null) => void;
}

export interface UsePlannerReturn {
  plannedTasks: PlannedTask[];
  displayTasks: PlannedTask[];
  filter: PlannerFilter;
  setFilter: (f: PlannerFilter) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  summary: PlannerSummary;
  addPlannedTask: (input: PlannedTaskInput) => { success: boolean; error?: string };
  updatePlannedTask: (
    id: string,
    updates: Partial<PlannedTaskInput>
  ) => { success: boolean; error?: string };
  deletePlannedTask: (id: string) => void;
  togglePlannedTaskCompletion: (id: string) => void;
  toggleTodayPriority: (id: string) => void;
  toggleInProgress: (id: string) => void;
  setAsFocusGoal: (id: string) => void;
  isTaskOverdue: (task: PlannedTask) => boolean;
  isTaskUpcoming: (task: PlannedTask) => boolean;
  unplannedExistingTasks: Task[];
}

const PRIORITY_WEIGHTS: Record<PlannerPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function usePlanner({
  tasks,
  activeTaskId,
  addTask,
  updateTaskTitle,
  toggleTask,
  selectActiveTask,
}: UsePlannerOptions): UsePlannerReturn {
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [filter, setFilter] = useState<PlannerFilter>('all');
  const [rawPlannedTasks, setRawPlannedTasks] = useState<PlannedTask[]>(() =>
    loadPlannedTasksFromStorage()
  );

  // Synchronize planned tasks with the latest tasks from the central task system
  const synchronizedPlannedTasks = useMemo(() => {
    const tasksMap = new Map<string, Task>();
    for (const t of tasks) {
      tasksMap.set(t.id, t);
    }

    return rawPlannedTasks
      .filter((pt) => tasksMap.has(pt.id))
      .map((pt) => {
        const matchingTask = tasksMap.get(pt.id)!;
        return {
          ...pt,
          title: matchingTask.title,
          completed: matchingTask.completed,
          inProgress: Boolean(pt.inProgress || pt.id === activeTaskId),
        };
      });
  }, [activeTaskId, rawPlannedTasks, tasks]);

  // Save to storage whenever raw planned tasks change
  useEffect(() => {
    savePlannedTasksToStorage(rawPlannedTasks);
  }, [rawPlannedTasks]);

  // Filter tasks for the selected date
  const todayTasks = useMemo(() => {
    return synchronizedPlannedTasks.filter((t) => t.date === selectedDate);
  }, [selectedDate, synchronizedPlannedTasks]);

  // Current local time string in HH:mm
  const getCurrentLocalTime = useCallback(() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }, []);

  // Helper to determine if a task is overdue
  const isTaskOverdue = useCallback(
    (task: PlannedTask): boolean => {
      if (task.completed) return false;
      const todayDate = getLocalDateString();

      // If scheduled for a past date and not completed -> overdue
      if (task.date < todayDate) return true;
      // If scheduled for a future date -> not overdue
      if (task.date > todayDate) return false;

      // On today's date:
      const currentTimeStr = getCurrentLocalTime();

      if (task.deadline) {
        return currentTimeStr > task.deadline;
      }

      if (task.startTime) {
        return currentTimeStr > task.startTime && !task.inProgress;
      }

      return false;
    },
    [getCurrentLocalTime]
  );

  // Helper to determine if a task is upcoming
  const isTaskUpcoming = useCallback(
    (task: PlannedTask): boolean => {
      if (task.completed) return false;
      if (isTaskOverdue(task)) return false;

      const todayDate = getLocalDateString();
      if (task.date > todayDate) return true;
      if (task.date < todayDate) return false;

      const currentTimeStr = getCurrentLocalTime();
      if (task.startTime) {
        return task.startTime >= currentTimeStr;
      }

      return false;
    },
    [getCurrentLocalTime, isTaskOverdue]
  );

  // Summary counts
  const summary: PlannerSummary = useMemo(() => {
    const total = todayTasks.length;
    const completed = todayTasks.filter((t) => t.completed).length;
    const remaining = total - completed;
    return { total, completed, remaining };
  }, [todayTasks]);

  // Chronologically sorted tasks for display
  const displayTasks = useMemo(() => {
    // 1. Filter by status filter
    const filtered = todayTasks.filter((task) => {
      if (filter === 'completed') return task.completed;
      if (filter === 'in_progress') return !task.completed && (task.inProgress || task.id === activeTaskId);
      if (filter === 'planned') return !task.completed && !task.inProgress && task.id !== activeTaskId;
      return true; // 'all'
    });

    // 2. Sort chronologically
    return [...filtered].sort((a, b) => {
      const aHasTime = Boolean(a.startTime);
      const bHasTime = Boolean(b.startTime);

      // Tasks with scheduled times appear first
      if (aHasTime && bHasTime) {
        const timeDiff = a.startTime!.localeCompare(b.startTime!);
        if (timeDiff !== 0) return timeDiff;

        // Secondary sort: Priority (High > Medium > Low)
        const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
        if (priorityDiff !== 0) return priorityDiff;

        return a.createdAt - b.createdAt;
      }

      if (aHasTime && !bHasTime) return -1;
      if (!aHasTime && bHasTime) return 1;

      // Unscheduled tasks: sort by Priority (High > Medium > Low), then creation time
      const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return a.createdAt - b.createdAt;
    });
  }, [activeTaskId, filter, todayTasks]);

  // Unplanned existing tasks that can be picked
  const unplannedExistingTasks = useMemo(() => {
    const plannedIds = new Set(todayTasks.map((t) => t.id));
    return tasks.filter((t) => !t.completed && !plannedIds.has(t.id));
  }, [tasks, todayTasks]);

  // Add planned task
  const addPlannedTask = useCallback(
    (input: PlannedTaskInput): { success: boolean; error?: string } => {
      const trimmedTitle = input.title.trim();
      if (!trimmedTitle) {
        return { success: false, error: 'Task title cannot be empty.' };
      }

      if (input.startTime && !isValidTimeFormat(input.startTime)) {
        return { success: false, error: 'Start time must be in valid HH:mm format (00:00 - 23:59).' };
      }

      if (input.deadline && !isValidTimeFormat(input.deadline)) {
        return { success: false, error: 'Deadline must be in valid HH:mm format (00:00 - 23:59).' };
      }

      if (input.startTime && input.deadline && input.deadline < input.startTime) {
        return { success: false, error: 'Deadline cannot be earlier than planned start time.' };
      }

      const targetDate = input.date || selectedDate;

      // Case A: User selected an existing Doflow task
      if (input.id) {
        // Prevent duplicate planning of the same task on the same date
        const existingForDate = rawPlannedTasks.find(
          (pt) => pt.id === input.id && pt.date === targetDate
        );
        if (existingForDate) {
          return { success: false, error: 'This task is already planned for the selected date.' };
        }

        const existingTask = tasks.find((t) => t.id === input.id);
        if (!existingTask) {
          return { success: false, error: 'Selected task could not be found.' };
        }

        const newPlanned: PlannedTask = {
          id: existingTask.id,
          title: existingTask.title,
          completed: existingTask.completed,
          createdAt: existingTask.createdAt,
          date: targetDate,
          startTime: input.startTime || undefined,
          deadline: input.deadline || undefined,
          priority: input.priority || 'medium',
          inProgress: Boolean(input.inProgress),
          isTodayPriority: Boolean(input.isTodayPriority),
        };

        setRawPlannedTasks((prev) => [newPlanned, ...prev]);
        return { success: true };
      }

      // Case B: Create new Doflow task and schedule it
      const newId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const created = addTask(trimmedTitle, newId);
      if (!created) {
        return { success: false, error: 'Could not create task.' };
      }

      const newPlanned: PlannedTask = {
        id: newId,
        title: trimmedTitle,
        completed: false,
        createdAt: Date.now(),
        date: targetDate,
        startTime: input.startTime || undefined,
        deadline: input.deadline || undefined,
        priority: input.priority || 'medium',
        inProgress: Boolean(input.inProgress),
        isTodayPriority: Boolean(input.isTodayPriority),
      };

      setRawPlannedTasks((prev) => [newPlanned, ...prev]);
      return { success: true };
    },
    [addTask, rawPlannedTasks, selectedDate, tasks]
  );

  // Update planned task
  const updatePlannedTask = useCallback(
    (id: string, updates: Partial<PlannedTaskInput>): { success: boolean; error?: string } => {
      if (updates.startTime && !isValidTimeFormat(updates.startTime)) {
        return { success: false, error: 'Start time must be in valid HH:mm format.' };
      }
      if (updates.deadline && !isValidTimeFormat(updates.deadline)) {
        return { success: false, error: 'Deadline must be in valid HH:mm format.' };
      }

      const target = rawPlannedTasks.find((t) => t.id === id);
      if (!target) {
        return { success: false, error: 'Task not found.' };
      }

      const finalStart = updates.startTime !== undefined ? updates.startTime : target.startTime;
      const finalDeadline = updates.deadline !== undefined ? updates.deadline : target.deadline;

      if (finalStart && finalDeadline && finalDeadline < finalStart) {
        return { success: false, error: 'Deadline cannot be earlier than planned start time.' };
      }

      // If title updated, synchronize title in central tasks
      if (updates.title && updates.title.trim()) {
        updateTaskTitle?.(id, updates.title.trim());
      }

      setRawPlannedTasks((prev) =>
        prev.map((pt) => {
          if (pt.id !== id) return pt;
          return {
            ...pt,
            title: updates.title ? updates.title.trim() : pt.title,
            startTime: updates.startTime !== undefined ? updates.startTime || undefined : pt.startTime,
            deadline: updates.deadline !== undefined ? updates.deadline || undefined : pt.deadline,
            priority: updates.priority || pt.priority,
            inProgress: updates.inProgress !== undefined ? updates.inProgress : pt.inProgress,
            isTodayPriority:
              updates.isTodayPriority !== undefined
                ? updates.isTodayPriority
                : pt.isTodayPriority,
          };
        })
      );

      return { success: true };
    },
    [rawPlannedTasks, updateTaskTitle]
  );

  // Delete planned task (removes from planner)
  const deletePlannedTask = useCallback((id: string) => {
    setRawPlannedTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Toggle completion: kept in sync with central useTasks
  const togglePlannedTaskCompletion = useCallback(
    (id: string) => {
      toggleTask(id);
    },
    [toggleTask]
  );

  // Toggle today's top priority
  const toggleTodayPriority = useCallback((id: string) => {
    setRawPlannedTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isTodayPriority: !t.isTodayPriority } : t))
    );
  }, []);

  // Toggle in progress
  const toggleInProgress = useCallback((id: string) => {
    setRawPlannedTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, inProgress: !t.inProgress } : t))
    );
  }, []);

  // Set as focus goal
  const setAsFocusGoal = useCallback(
    (id: string) => {
      selectActiveTask(id);
    },
    [selectActiveTask]
  );

  return {
    plannedTasks: synchronizedPlannedTasks,
    displayTasks,
    filter,
    setFilter,
    selectedDate,
    setSelectedDate,
    summary,
    addPlannedTask,
    updatePlannedTask,
    deletePlannedTask,
    togglePlannedTaskCompletion,
    toggleTodayPriority,
    toggleInProgress,
    setAsFocusGoal,
    isTaskOverdue,
    isTaskUpcoming,
    unplannedExistingTasks,
  };
}
