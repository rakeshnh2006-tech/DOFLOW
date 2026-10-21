import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormattedTime, TimerStatus, UseTimerOptions, UseTimerReturn } from '../types/timer';

export const DEFAULT_FOCUS_DURATION_MS = 25 * 60 * 1000; // 25 minutes = 1,500,000 ms
const DEFAULT_TICK_INTERVAL_MS = 100; // Check deadline every 100ms

/**
 * Format remaining milliseconds into { minutes, seconds, display }.
 * Uses Math.ceil on remaining seconds so that e.g. 25:00 stays 25:00 for the first
 * second, displays 00:01 during the final second, and reaches 00:00 when 0ms remain.
 */
export function formatMilliseconds(ms: number): FormattedTime {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.max(0, Math.ceil(safeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  return {
    minutes: paddedMinutes,
    seconds: paddedSeconds,
    display: `${paddedMinutes}:${paddedSeconds}`,
  };
}

/**
 * Deadline-based Focus Timer Hook.
 *
 * Guarantees:
 * - Deadline-based countdown via wall-clock timestamps (Date.now()).
 * - Immune to browser tab throttling / background drift.
 * - Single controlled timer mechanism (no concurrent intervals).
 * - Clamped at zero (never negative).
 * - Exact-once onComplete triggering.
 * - Complete resource cleanup on unmount.
 * - Resettable with current or new duration (mode switching).
 */
export function useTimer(options: UseTimerOptions = {}): UseTimerReturn {
  const {
    initialDurationMs = DEFAULT_FOCUS_DURATION_MS,
    onComplete,
    tickIntervalMs = DEFAULT_TICK_INTERVAL_MS,
  } = options;

  const [durationMs, setDurationMs] = useState<number>(initialDurationMs);
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [remainingMs, setRemainingMs] = useState<number>(initialDurationMs);

  // Synchronization refs to eliminate race conditions and avoid stale closures
  const timerIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const durationMsRef = useRef<number>(initialDurationMs);
  const remainingMsRef = useRef<number>(initialDurationMs);
  const statusRef = useRef<TimerStatus>('idle');
  const completedCalledRef = useRef<boolean>(false);
  const onCompleteRef = useRef<(() => void) | undefined>(onComplete);

  // Keep onComplete ref up-to-date
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Sync initial duration changes if currently idle
  useEffect(() => {
    if (statusRef.current === 'idle') {
      durationMsRef.current = initialDurationMs;
      remainingMsRef.current = initialDurationMs;
      setDurationMs(initialDurationMs);
      setRemainingMs(initialDurationMs);
    }
  }, [initialDurationMs]);

  // Clear running timer interval
  const clearTimer = useCallback(() => {
    if (timerIdRef.current !== null) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  // Tick calculation function
  const evaluateTick = useCallback(() => {
    if (statusRef.current !== 'running' || deadlineRef.current === null) {
      return;
    }

    const now = Date.now();
    const diff = deadlineRef.current - now;

    if (diff <= 0) {
      // Transition to zero reached
      clearTimer();
      deadlineRef.current = null;
      remainingMsRef.current = 0;
      statusRef.current = 'completed';
      setRemainingMs(0);
      setStatus('completed');

      if (!completedCalledRef.current) {
        completedCalledRef.current = true;
        onCompleteRef.current?.();
      }
    } else {
      remainingMsRef.current = diff;
      setRemainingMs(diff);
    }
  }, [clearTimer]);

  // Start the interval ticker
  const startInterval = useCallback(() => {
    clearTimer();
    timerIdRef.current = setInterval(() => {
      evaluateTick();
    }, tickIntervalMs);
  }, [clearTimer, evaluateTick, tickIntervalMs]);

  // 1. Start timer from idle state
  const start = useCallback(() => {
    // Only allow starting if currently idle
    if (statusRef.current !== 'idle') {
      return;
    }

    completedCalledRef.current = false;
    deadlineRef.current = Date.now() + remainingMsRef.current;
    statusRef.current = 'running';
    setStatus('running');
    startInterval();
  }, [startInterval]);

  // 2. Pause timer
  const pause = useCallback(() => {
    // Only allow pausing if currently running
    if (statusRef.current !== 'running') {
      return;
    }

    clearTimer();

    // Preserve the exact remaining time based on current deadline
    const currentRemaining = deadlineRef.current !== null
      ? Math.max(0, deadlineRef.current - Date.now())
      : remainingMsRef.current;

    deadlineRef.current = null;
    remainingMsRef.current = currentRemaining;
    statusRef.current = 'paused';
    setRemainingMs(currentRemaining);
    setStatus('paused');
  }, [clearTimer]);

  // 3. Resume timer from paused state
  const resume = useCallback(() => {
    // Only allow resuming if currently paused
    if (statusRef.current !== 'paused') {
      return;
    }

    if (remainingMsRef.current <= 0) {
      statusRef.current = 'completed';
      setStatus('completed');
      return;
    }

    deadlineRef.current = Date.now() + remainingMsRef.current;
    statusRef.current = 'running';
    setStatus('running');
    startInterval();
  }, [startInterval]);

  // 4. Reset timer back to current or new duration
  const reset = useCallback((newDuration?: number) => {
    clearTimer();
    const targetDuration = typeof newDuration === 'number' ? newDuration : durationMsRef.current;
    deadlineRef.current = null;
    completedCalledRef.current = false;
    durationMsRef.current = targetDuration;
    remainingMsRef.current = targetDuration;
    statusRef.current = 'idle';
    setDurationMs(targetDuration);
    setRemainingMs(targetDuration);
    setStatus('idle');
  }, [clearTimer]);

  // 5. Explicitly set a new duration and reset to idle
  const setDuration = useCallback((newDuration: number) => {
    reset(newDuration);
  }, [reset]);

  // Tab switching / visibilitychange listener to instantly catch up without delay
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && statusRef.current === 'running') {
        evaluateTick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [evaluateTick]);

  // Clean up timer resources when component unmounts
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const formattedTime = useMemo(() => formatMilliseconds(remainingMs), [remainingMs]);

  const progress = useMemo(() => {
    if (durationMs <= 0) return 1;
    const elapsed = durationMs - remainingMs;
    return Math.min(1, Math.max(0, elapsed / durationMs));
  }, [durationMs, remainingMs]);

  return {
    status,
    remainingMs,
    durationMs,
    formattedTime,
    progress,
    isIdle: status === 'idle',
    isRunning: status === 'running',
    isPaused: status === 'paused',
    isCompleted: status === 'completed',
    start,
    pause,
    resume,
    reset,
    setDuration,
  };
}
