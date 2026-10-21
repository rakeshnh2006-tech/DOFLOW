export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface ModeConfig {
  id: TimerMode;
  label: string;
  defaultDurationMs: number;
  ariaLabel: string;
}

export const TIMER_MODES: Record<TimerMode, ModeConfig> = {
  focus: {
    id: 'focus',
    label: 'Focus',
    defaultDurationMs: 25 * 60 * 1000, // 25 minutes = 1,500,000 ms
    ariaLabel: 'Focus mode, 25 minutes',
  },
  shortBreak: {
    id: 'shortBreak',
    label: 'Short Break',
    defaultDurationMs: 5 * 60 * 1000, // 5 minutes = 300,000 ms
    ariaLabel: 'Short Break mode, 5 minutes',
  },
  longBreak: {
    id: 'longBreak',
    label: 'Long Break',
    defaultDurationMs: 15 * 60 * 1000, // 15 minutes = 900,000 ms
    ariaLabel: 'Long Break mode, 15 minutes',
  },
};

export interface UseTimerOptions {
  /**
   * Initial countdown duration in milliseconds.
   * Default: 25 minutes (25 * 60 * 1000 = 1,500,000 ms).
   */
  initialDurationMs?: number;

  /**
   * Optional callback fired once when the countdown reaches 00:00.
   */
  onComplete?: () => void;

  /**
   * Interval for checking the deadline in milliseconds.
   * Default: 100ms for responsive and accurate deadline tracking.
   */
  tickIntervalMs?: number;
}

export interface FormattedTime {
  minutes: string;
  seconds: string;
  display: string;
}

export interface UseTimerReturn {
  status: TimerStatus;
  remainingMs: number;
  durationMs: number;
  formattedTime: FormattedTime;
  progress: number; // 0 (start) to 1 (completed)
  isIdle: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (newDurationMs?: number) => void;
  setDuration: (newDurationMs: number) => void;
}
