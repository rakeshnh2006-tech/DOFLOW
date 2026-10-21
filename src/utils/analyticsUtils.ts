import type { CompletedSessionRecord } from '../types/stats';
import type { Task } from '../types/task';
import type {
  DateRangeType,
  DayBreakdown,
  WeeklyComparison,
  WeeklyProductivityMetrics,
} from '../types/analytics';
import { getLocalDateString } from './statsStorage';
export { getLocalDateString };

/**
 * Returns the Monday of the week containing the given reference date (in local time).
 */
export function getMondayOfWeek(referenceDate: Date = new Date()): Date {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const dayOfMonth = referenceDate.getDate();
  const dayOfWeek = referenceDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday

  // Difference in days to reach the preceding Monday
  // If Sunday (0), diff is -6. If Monday (1), diff is 0. If Tuesday (2), diff is -1.
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

  return new Date(year, month, dayOfMonth + diffToMonday, 0, 0, 0, 0);
}

/**
 * Returns a 7-day range for a given week offset (0 for this week, -1 for last week).
 */
export function getWeekRange(
  referenceDate: Date = new Date(),
  offsetWeeks: number = 0
): { startDate: string; endDate: string; days: string[] } {
  const ref = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() + offsetWeeks * 7
  );
  const monday = getMondayOfWeek(ref);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    days.push(getLocalDateString(d.getTime()));
  }

  return {
    startDate: days[0],
    endDate: days[6],
    days,
  };
}

/**
 * Parses a YYYY-MM-DD date string safely into local Date components.
 */
export function parseLocalDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [year, month, day] = parts;
  if (year < 1970 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Generates an array of YYYY-MM-DD date strings between start and end inclusive (capped at 90 days).
 */
export function getDaysInRange(startDateStr: string, endDateStr: string): string[] {
  let start = parseLocalDateString(startDateStr);
  let end = parseLocalDateString(endDateStr);

  if (!start && !end) {
    const today = getLocalDateString();
    return [today];
  }
  if (!start) start = end!;
  if (!end) end = start;

  // If start is after end, swap them
  if (start.getTime() > end.getTime()) {
    const temp = start;
    start = end;
    end = temp;
  }

  const days: string[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let count = 0;
  const MAX_DAYS = 90; // Prevent runaway loops

  while (current.getTime() <= end.getTime() && count < MAX_DAYS) {
    days.push(getLocalDateString(current.getTime()));
    current.setDate(current.getDate() + 1);
    count++;
  }

  return days;
}

/**
 * Formats a date range into a readable string (e.g. "Oct 19 – Oct 25, 2026").
 */
export function formatDateRange(startDateStr: string, endDateStr: string): string {
  const start = parseLocalDateString(startDateStr);
  const end = parseLocalDateString(endDateStr);

  if (!start || !end) return `${startDateStr} – ${endDateStr}`;

  if (startDateStr === endDateStr) {
    return start.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const startMonth = start.toLocaleDateString(undefined, { month: 'short' });
  const startDay = start.getDate();
  const startYear = start.getFullYear();

  const endMonth = end.toLocaleDateString(undefined, { month: 'short' });
  const endDay = end.getDate();
  const endYear = end.getFullYear();

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} – ${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
}

/**
 * Calculates all metrics and breakdowns for a given date range.
 */
export function calculateWeeklyMetrics({
  days,
  sessionHistory,
  tasks,
  rangeType = 'this-week',
  previousDays,
}: {
  days: string[];
  sessionHistory: CompletedSessionRecord[];
  tasks: Task[];
  rangeType?: DateRangeType;
  previousDays?: string[];
}): WeeklyProductivityMetrics {
  const todayStr = getLocalDateString();
  const startDate = days[0] || todayStr;
  const endDate = days[days.length - 1] || todayStr;
  const formattedRange = formatDateRange(startDate, endDate);

  // 1. Group focus sessions by local date (strictly focus sessions, exclude breaks!)
  const focusSessionsByDate = new Map<string, CompletedSessionRecord[]>();
  for (const record of sessionHistory) {
    // Validate record integrity
    if (!record || record.mode !== 'focus' || typeof record.durationMs !== 'number' || record.durationMs <= 0) {
      continue;
    }
    // Fallback if localDate is missing on older records
    const dateKey = record.localDate || getLocalDateString(record.completedAt);
    if (!focusSessionsByDate.has(dateKey)) {
      focusSessionsByDate.set(dateKey, []);
    }
    focusSessionsByDate.get(dateKey)!.push(record);
  }

  // 2. Group unique completed tasks by completion date
  // Deduplicate by task ID so tasks are never counted twice
  const completedTasksByDate = new Map<string, Set<string>>();
  for (const task of tasks) {
    if (!task || !task.completed || typeof task.id !== 'string') {
      continue;
    }
    // Completion date attribution: prefer completedAt, fallback to createdAt, fallback to today
    let dateKey: string;
    if (typeof task.completedAt === 'number' && task.completedAt > 0) {
      dateKey = getLocalDateString(task.completedAt);
    } else if (typeof task.createdAt === 'number' && task.createdAt > 0) {
      dateKey = getLocalDateString(task.createdAt);
    } else {
      dateKey = todayStr;
    }

    if (!completedTasksByDate.has(dateKey)) {
      completedTasksByDate.set(dateKey, new Set<string>());
    }
    completedTasksByDate.get(dateKey)!.add(task.id);
  }

  // 3. Build DayBreakdown for each day in range
  let maxFocusMinutes = -1;
  let topDate: string | null = null;

  const dayBreakdowns: DayBreakdown[] = days.map((dateStr) => {
    const d = parseLocalDateString(dateStr) || new Date();
    const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
    const dayFullName = d.toLocaleDateString(undefined, { weekday: 'long' });
    const formattedDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const daySessions = focusSessionsByDate.get(dateStr) || [];
    const totalMs = daySessions.reduce((sum, r) => sum + r.durationMs, 0);
    const focusMinutes = Math.round(totalMs / (60 * 1000));
    const focusSessions = daySessions.length;

    const completedTasksCount = completedTasksByDate.get(dateStr)?.size || 0;

    if (focusMinutes > maxFocusMinutes && focusMinutes > 0) {
      maxFocusMinutes = focusMinutes;
      topDate = dateStr;
    }

    return {
      date: dateStr,
      dayName,
      dayFullName,
      formattedDate,
      focusMinutes,
      focusSessions,
      completedTasks: completedTasksCount,
      isToday: dateStr === todayStr,
      isMostProductive: false, // Flagged below
    };
  });

  // Flag the most productive day
  if (topDate && maxFocusMinutes > 0) {
    for (const b of dayBreakdowns) {
      if (b.date === topDate) {
        b.isMostProductive = true;
      }
    }
  }

  // 4. Period totals
  const totalFocusMinutes = dayBreakdowns.reduce((acc, d) => acc + d.focusMinutes, 0);
  const totalFocusSessions = dayBreakdowns.reduce((acc, d) => acc + d.focusSessions, 0);
  const totalCompletedTasks = dayBreakdowns.reduce((acc, d) => acc + d.completedTasks, 0);

  const numDays = Math.max(1, days.length);
  const averageFocusMinutesPerDay = Math.round(totalFocusMinutes / numDays);
  const averageDescription = `Calculated across all ${numDays} days in this period (Total Focus Minutes ÷ ${numDays} days)`;

  const hasActivity = totalFocusMinutes > 0 || totalFocusSessions > 0 || totalCompletedTasks > 0;

  // Most productive day details
  const bestDay = topDate ? dayBreakdowns.find((d) => d.date === topDate) : null;
  const mostProductiveDay =
    bestDay && bestDay.focusMinutes > 0
      ? {
          date: bestDay.date,
          dayFullName: bestDay.dayFullName,
          focusMinutes: bestDay.focusMinutes,
        }
      : null;

  // 5. Comparison with previous period (e.g. Previous Week)
  let comparison: WeeklyComparison | undefined = undefined;
  if (previousDays && previousDays.length > 0) {
    let prevTotalMs = 0;
    let prevSessions = 0;
    let prevTasks = 0;

    for (const pDate of previousDays) {
      const pSessions = focusSessionsByDate.get(pDate) || [];
      prevSessions += pSessions.length;
      prevTotalMs += pSessions.reduce((acc, r) => acc + r.durationMs, 0);
      prevTasks += completedTasksByDate.get(pDate)?.size || 0;
    }

    const prevFocusMinutes = Math.round(prevTotalMs / (60 * 1000));
    const hasPreviousData = prevFocusMinutes > 0 || prevSessions > 0 || prevTasks > 0;

    const focusMinutesDiff = totalFocusMinutes - prevFocusMinutes;
    const focusMinutesPercentDiff =
      prevFocusMinutes > 0
        ? Math.round(((totalFocusMinutes - prevFocusMinutes) / prevFocusMinutes) * 100)
        : null;

    comparison = {
      hasPreviousData,
      previousTotalFocusMinutes: prevFocusMinutes,
      previousTotalSessions: prevSessions,
      previousTotalTasks: prevTasks,
      focusMinutesDiff,
      focusMinutesPercentDiff,
      sessionsDiff: totalFocusSessions - prevSessions,
      tasksDiff: totalCompletedTasks - prevTasks,
    };
  }

  return {
    rangeType,
    startDate,
    endDate,
    formattedRange,
    totalFocusMinutes,
    totalFocusSessions,
    totalCompletedTasks,
    averageFocusMinutesPerDay,
    averageDescription,
    mostProductiveDay,
    days: dayBreakdowns,
    hasActivity,
    comparison,
  };
}
