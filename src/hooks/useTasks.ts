import { useCallback, useMemo, useState } from 'react';
import type { Task, UseTasksReturn } from '../types/task';
import {
  loadActiveTaskId,
  loadTasksFromStorage,
  saveActiveTaskId,
  saveTasksToStorage,
} from '../utils/taskStorage';

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromStorage());
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => {
    const savedActiveId = loadActiveTaskId();
    const initialTasks = loadTasksFromStorage();
    // Validate that savedActiveId actually exists in initialTasks
    if (savedActiveId && initialTasks.some((t) => t.id === savedActiveId)) {
      return savedActiveId;
    }
    // If not found or null, default to first uncompleted task if available, or null
    return null;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // 1. Add Task (rejects empty or whitespace-only)
  const addTask = useCallback((title: string, customId?: string): boolean => {
    const trimmed = title.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a task description. Task name cannot be empty.');
      return false;
    }

    const newTask: Task = {
      id:
        customId ||
        (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      title: trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    setTasks((prevTasks) => {
      const updated = [newTask, ...prevTasks];
      saveTasksToStorage(updated);
      return updated;
    });

    // Auto-select as active task if none is currently selected
    setActiveTaskId((prevActiveId) => {
      if (prevActiveId === null) {
        saveActiveTaskId(newTask.id);
        return newTask.id;
      }
      return prevActiveId;
    });

    setErrorMessage(null);
    return true;
  }, []);

  // Update existing task title
  const updateTaskTitle = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setTasks((prevTasks) => {
      const updated = prevTasks.map((t) => (t.id === id ? { ...t, title: trimmed } : t));
      saveTasksToStorage(updated);
      return updated;
    });
  }, []);

  // 2. Toggle Task completion (and undo completion)
  const toggleTask = useCallback((id: string) => {
    setTasks((prevTasks) => {
      const updated = prevTasks.map((t) => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          return {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? Date.now() : undefined,
          };
        }
        return t;
      });
      saveTasksToStorage(updated);
      return updated;
    });
  }, []);

  // 3. Delete Task
  const deleteTask = useCallback((id: string) => {
    setTasks((prevTasks) => {
      const updated = prevTasks.filter((t) => t.id !== id);
      saveTasksToStorage(updated);
      return updated;
    });

    setActiveTaskId((prevActiveId) => {
      if (prevActiveId === id) {
        saveActiveTaskId(null);
        return null;
      }
      return prevActiveId;
    });
  }, []);

  // 4. Select exactly one active task for the focus session
  const selectActiveTask = useCallback((id: string | null) => {
    setActiveTaskId((prevId) => {
      const nextId = prevId === id ? null : id;
      saveActiveTaskId(nextId);
      return nextId;
    });
  }, []);

  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return tasks.find((t) => t.id === activeTaskId) ?? null;
  }, [activeTaskId, tasks]);

  return {
    tasks,
    activeTaskId,
    activeTask,
    errorMessage,
    addTask,
    updateTaskTitle,
    toggleTask,
    deleteTask,
    selectActiveTask,
    clearError,
  };
}
