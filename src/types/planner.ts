export type PlannerPriority = 'low' | 'medium' | 'high';

export type PlannerFilter = 'all' | 'planned' | 'in_progress' | 'completed';

export interface PlannedTask {
  id: string; // References Task.id in the core task system
  title: string;
  completed: boolean;
  createdAt: number;
  date: string; // 'YYYY-MM-DD' in user's local calendar timezone
  startTime?: string; // 'HH:mm' e.g. "09:30"
  deadline?: string; // 'HH:mm' e.g. "11:00"
  priority: PlannerPriority;
  inProgress?: boolean;
  isTodayPriority?: boolean;
}

export interface PlannedTaskInput {
  id?: string; // If selecting an existing task from Doflow
  title: string;
  date?: string; // Defaults to today's local date
  startTime?: string;
  deadline?: string;
  priority: PlannerPriority;
  inProgress?: boolean;
  isTodayPriority?: boolean;
}

export interface PlannerSummary {
  total: number;
  completed: number;
  remaining: number;
}
