export type DateRangeType = 'this-week' | 'last-week' | 'custom';

export interface DayBreakdown {
  date: string; // 'YYYY-MM-DD'
  dayName: string; // 'Mon', 'Tue', etc.
  dayFullName: string; // 'Monday', 'Tuesday', etc.
  formattedDate: string; // 'Oct 20'
  focusMinutes: number;
  focusSessions: number;
  completedTasks: number;
  isToday: boolean;
  isMostProductive: boolean;
}

export interface WeeklyComparison {
  hasPreviousData: boolean;
  previousTotalFocusMinutes: number;
  previousTotalSessions: number;
  previousTotalTasks: number;
  focusMinutesDiff: number;
  focusMinutesPercentDiff: number | null;
  sessionsDiff: number;
  tasksDiff: number;
}

export interface WeeklyProductivityMetrics {
  rangeType: DateRangeType;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  formattedRange: string; // e.g. "Oct 19 – Oct 25, 2026"
  totalFocusMinutes: number;
  totalFocusSessions: number;
  totalCompletedTasks: number;
  averageFocusMinutesPerDay: number;
  averageDescription: string;
  mostProductiveDay: {
    date: string;
    dayFullName: string;
    focusMinutes: number;
  } | null;
  days: DayBreakdown[];
  hasActivity: boolean;
  comparison?: WeeklyComparison;
}
