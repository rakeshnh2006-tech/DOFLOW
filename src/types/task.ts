export interface Task {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface UseTasksReturn {
  tasks: Task[];
  activeTaskId: string | null;
  activeTask: Task | null;
  errorMessage: string | null;
  addTask: (title: string, customId?: string) => boolean;
  updateTaskTitle?: (id: string, newTitle: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  selectActiveTask: (id: string | null) => void;
  clearError: () => void;
}
