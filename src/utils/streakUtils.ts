import type {
  Habit,
  HabitCompletion,
  HabitPeriod,
  HabitStreak,
} from '../types/habit';
import { getLocalDateString } from './statsStorage';
import { parseLocalDateString } from './analyticsUtils';

export { getLocalDateString };

/**
 * Checks whether a habit is scheduled to be performed on a specific calendar date.
 */
export function isHabitScheduledOnDate(habit: Habit, date: Date | string): boolean {
  const d = typeof date === 'string' ? parseLocalDateString(date) : date;
  if (!d) return false;

  const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'custom':
      if (Array.isArray(habit.customDays) && habit.customDays.length > 0) {
        return habit.customDays.includes(dayOfWeek);
      }
      return true;
    default:
      return true;
  }
}

/**
 * Calculates accurate streaks and statistics for a habit based strictly on actual completion records.
 */
export function calculateHabitStreak({
  habit,
  completions,
  referenceDateStr,
  period = '30days',
}: {
  habit: Habit;
  completions: HabitCompletion[];
  referenceDateStr?: string;
  period?: HabitPeriod;
}): HabitStreak {
  const todayStr = referenceDateStr || getLocalDateString();
  const todayDate = parseLocalDateString(todayStr) || new Date();

  // Filter completions belonging to this habit and store in a Set for O(1) lookups
  const completionDates = new Set<string>();
  for (const c of completions) {
    if (c.habitId === habit.id && c.date) {
      completionDates.add(c.date);
    }
  }

  const isCompletedToday = completionDates.has(todayStr);
  const isScheduledToday = isHabitScheduledOnDate(habit, todayDate);

  // -------------------------------------------------------------
  // 1. Calculate Current Streak
  // -------------------------------------------------------------
  let currentStreak = 0;

  // If today is scheduled and completed -> counts toward streak
  if (isScheduledToday && isCompletedToday) {
    currentStreak++;
  }

  // Step backward starting from yesterday
  const iterDate = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate() - 1
  );

  const MAX_LOOKBACK_DAYS = 365 * 2;
  let lookbackDays = 0;

  while (lookbackDays < MAX_LOOKBACK_DAYS) {
    const dateStr = getLocalDateString(iterDate.getTime());
    const isScheduled = isHabitScheduledOnDate(habit, iterDate);

    if (isScheduled) {
      if (completionDates.has(dateStr)) {
        currentStreak++;
      } else {
        // First missed scheduled day encountered going backwards -> streak stops!
        break;
      }
    }
    // Unscheduled days are skipped: they do NOT break the streak and do NOT increment it.

    iterDate.setDate(iterDate.getDate() - 1);
    lookbackDays++;
  }

  // -------------------------------------------------------------
  // 2. Calculate Longest Streak
  // -------------------------------------------------------------
  let longestStreak = 0;
  let runningStreak = 0;

  // Determine earliest start date (habit creation date or earliest completion)
  const habitCreationStr = getLocalDateString(habit.createdAt);
  let earliestDate = parseLocalDateString(habitCreationStr) || todayDate;

  for (const dateStr of completionDates) {
    const d = parseLocalDateString(dateStr);
    if (d && d.getTime() < earliestDate.getTime()) {
      earliestDate = d;
    }
  }

  // Step forward day by day from earliestDate to todayDate
  const forwardDate = new Date(
    earliestDate.getFullYear(),
    earliestDate.getMonth(),
    earliestDate.getDate()
  );

  while (forwardDate.getTime() <= todayDate.getTime()) {
    const dateStr = getLocalDateString(forwardDate.getTime());
    const isScheduled = isHabitScheduledOnDate(habit, forwardDate);
    const isToday = dateStr === todayStr;

    if (isScheduled) {
      if (completionDates.has(dateStr)) {
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        // Missed scheduled day
        if (!isToday) {
          // A missed scheduled day in the past resets the running streak
          runningStreak = 0;
        }
        // If it's today and not yet completed, today is still in progress, so do not reset runningStreak
      }
    }

    forwardDate.setDate(forwardDate.getDate() + 1);
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  // -------------------------------------------------------------
  // 3. Completion Rate for Selected Period
  // -------------------------------------------------------------
  let windowDaysCount: number;
  if (period === '7days') {
    windowDaysCount = 7;
  } else if (period === '30days') {
    windowDaysCount = 30;
  } else if (period === 'month') {
    // Current calendar month days up to today
    windowDaysCount = todayDate.getDate();
  } else {
    // 'all'
    const diffMs = todayDate.getTime() - earliestDate.getTime();
    windowDaysCount = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }

  let scheduledOpportunities = 0;
  let completedInWindow = 0;

  const windowDate = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth(),
    todayDate.getDate()
  );

  for (let i = 0; i < windowDaysCount; i++) {
    const dStr = getLocalDateString(windowDate.getTime());
    if (isHabitScheduledOnDate(habit, windowDate)) {
      scheduledOpportunities++;
      if (completionDates.has(dStr)) {
        completedInWindow++;
      }
    }
    windowDate.setDate(windowDate.getDate() - 1);
  }

  const completionRatePercent =
    scheduledOpportunities > 0
      ? Math.round((completedInWindow / scheduledOpportunities) * 100)
      : 0;

  return {
    currentStreak,
    longestStreak,
    totalCompletions: completionDates.size,
    completionRatePercent,
    isCompletedToday,
    isScheduledToday,
  };
}

export type CalendarDayStatus =
  | 'completed'
  | 'missed'
  | 'rest-day'
  | 'future'
  | 'today-pending';

export interface CalendarDayCell {
  dateStr: string; // 'YYYY-MM-DD'
  dayOfMonth: number;
  dayOfWeek: number;
  isScheduled: boolean;
  isCompleted: boolean;
  isToday: boolean;
  isFuture: boolean;
  isCurrentMonth: boolean;
  status: CalendarDayStatus;
}

function computeCellStatus(
  isFuture: boolean,
  isScheduled: boolean,
  isCompleted: boolean,
  isToday: boolean
): CalendarDayStatus {
  if (isCompleted) return 'completed';
  if (isFuture) return 'future';
  if (!isScheduled) return 'rest-day';
  if (isToday) return 'today-pending';
  return 'missed';
}

/**
 * Formats a user-friendly description of the schedule.
 */
export function formatScheduleDescription(
  frequency: Habit['frequency'],
  customDays?: number[]
): string {
  if (frequency === 'daily') return 'Every day';
  if (frequency === 'weekdays') return 'Mon – Fri';
  if (frequency === 'custom') {
    if (!customDays || customDays.length === 0) return 'No days selected';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const sorted = [...customDays].sort((a, b) => {
      const aAdj = a === 0 ? 7 : a;
      const bAdj = b === 0 ? 7 : b;
      return aAdj - bAdj;
    });
    return sorted.map((d) => dayNames[d]).join(', ');
  }
  return 'Every day';
}

/**
 * Builds a month calendar grid (including leading/trailing padding days) for habit completion visualization.
 */
export function getHabitMonthCalendar({
  habit,
  completions,
  year,
  month, // 0-indexed: 0 = Jan, 9 = Oct
}: {
  habit: Habit;
  completions: HabitCompletion[];
  year: number;
  month: number;
}): CalendarDayCell[] {
  const todayStr = getLocalDateString();
  const completionDates = new Set<string>();
  for (const c of completions) {
    if (c.habitId === habit.id && c.date) {
      completionDates.add(c.date);
    }
  }

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Find Monday-based starting day (0 = Mon, 6 = Sun)
  const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;

  const cells: CalendarDayCell[] = [];

  // 1. Leading days from previous month
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthLastDate - i);
    const dateStr = getLocalDateString(prevDate.getTime());
    const isScheduled = isHabitScheduledOnDate(habit, prevDate);
    const isCompleted = completionDates.has(dateStr);
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    cells.push({
      dateStr,
      dayOfMonth: prevDate.getDate(),
      dayOfWeek: prevDate.getDay(),
      isScheduled,
      isCompleted,
      isToday,
      isFuture,
      isCurrentMonth: false,
      status: computeCellStatus(isFuture, isScheduled, isCompleted, isToday),
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const curDate = new Date(year, month, day);
    const dateStr = getLocalDateString(curDate.getTime());
    const isScheduled = isHabitScheduledOnDate(habit, curDate);
    const isCompleted = completionDates.has(dateStr);
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    cells.push({
      dateStr,
      dayOfMonth: day,
      dayOfWeek: curDate.getDay(),
      isScheduled,
      isCompleted,
      isToday,
      isFuture,
      isCurrentMonth: true,
      status: computeCellStatus(isFuture, isScheduled, isCompleted, isToday),
    });
  }

  // 3. Trailing days to complete 7-day rows (up to 35 or 42 cells)
  const totalCells = Math.ceil(cells.length / 7) * 7;
  const trailingNeeded = totalCells - cells.length;
  for (let day = 1; day <= trailingNeeded; day++) {
    const nextDate = new Date(year, month + 1, day);
    const dateStr = getLocalDateString(nextDate.getTime());
    const isScheduled = isHabitScheduledOnDate(habit, nextDate);
    const isCompleted = completionDates.has(dateStr);
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    cells.push({
      dateStr,
      dayOfMonth: day,
      dayOfWeek: nextDate.getDay(),
      isScheduled,
      isCompleted,
      isToday,
      isFuture,
      isCurrentMonth: false,
      status: computeCellStatus(isFuture, isScheduled, isCompleted, isToday),
    });
  }

  return cells;
}
