import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { TimerMode, TimerStatus } from '../types/timer';
import { TIMER_MODES } from '../types/timer';
import { useTimer, formatMilliseconds } from '../hooks/useTimer';
import { playCompletionSound } from '../utils/sound';
import { ModeSelector } from './ModeSelector';
import { TimerDisplay } from './TimerDisplay';
import { TimerControls } from './TimerControls';
import { TimerStatusBadge } from './TimerStatusBadge';
import { SwitchModeModal } from './SwitchModeModal';
import { SessionSuggestion } from './SessionSuggestion';
import { CycleIndicator } from './CycleIndicator';

export interface ModeDurations {
  focus?: number;
  shortBreak?: number;
  longBreak?: number;
}

export interface FocusTimerProps {
  /**
   * Backwards-compatible duration prop for Focus mode.
   * Default: 25 minutes (1,500,000 ms).
   */
  initialDurationMs?: number;
  /**
   * Configurable durations for all modes (in milliseconds) for fast automated testing.
   */
  durations?: ModeDurations;
  /**
   * Initial mode on mount. Default: 'focus'.
   */
  initialMode?: TimerMode;
  /**
   * Currently active focus task.
   */
  activeTask?: { id: string; title: string; completed: boolean } | null;
  /**
   * Whether completion chime sound is enabled.
   */
  soundEnabled?: boolean;
  /**
   * Optional callback triggered once when countdown completes.
   */
  onComplete?: (mode: TimerMode, durationMs?: number) => void;
  /**
   * Optional callback when mode changes.
   */
  onModeChange?: (mode: TimerMode) => void;
  /**
   * Optional callback when timer status changes.
   */
  onStatusChange?: (status: TimerStatus) => void;
  /**
   * Optional ref to expose reset callback.
   */
  resetTimerRef?: React.MutableRefObject<((newDuration?: number) => void) | null>;
}

export const FocusTimer: React.FC<FocusTimerProps> = ({
  initialDurationMs,
  durations,
  initialMode = 'focus',
  activeTask,
  soundEnabled = false,
  onComplete,
  onModeChange,
  onStatusChange,
  resetTimerRef,
}) => {
  // Configured durations per mode with fallback to standard Pomodoro defaults
  const resolvedDurations: Record<TimerMode, number> = useMemo(() => {
    return {
      focus: durations?.focus ?? initialDurationMs ?? TIMER_MODES.focus.defaultDurationMs,
      shortBreak: durations?.shortBreak ?? TIMER_MODES.shortBreak.defaultDurationMs,
      longBreak: durations?.longBreak ?? TIMER_MODES.longBreak.defaultDurationMs,
    };
  }, [durations, initialDurationMs]);

  const [currentMode, setCurrentMode] = useState<TimerMode>(initialMode);
  const [pendingModeSwitch, setPendingModeSwitch] = useState<TimerMode | null>(null);

  // Consecutive & total completed focus sessions
  const [consecutiveFocusSessions, setConsecutiveFocusSessions] = useState<number>(0);
  const [totalFocusSessions, setTotalFocusSessions] = useState<number>(0);
  const [lastCompletedSession, setLastCompletedSession] = useState<TimerMode | null>(null);

  const currentDuration = resolvedDurations[currentMode];

  // Completion handler called exactly once at zero
  const handleTimerComplete = useCallback(() => {
    setLastCompletedSession(currentMode);

    if (currentMode === 'focus') {
      setConsecutiveFocusSessions((prev) => prev + 1);
      setTotalFocusSessions((prev) => prev + 1);
    } else if (currentMode === 'longBreak') {
      // Long break completes a full 4-session cycle
      setConsecutiveFocusSessions(0);
    }

    if (soundEnabled) {
      playCompletionSound().catch(() => {});
    }

    onComplete?.(currentMode, currentDuration);
  }, [currentDuration, currentMode, onComplete, soundEnabled]);

  const {
    status,
    formattedTime,
    progress,
    start,
    pause,
    resume,
    reset,
  } = useTimer({
    initialDurationMs: currentDuration,
    onComplete: handleTimerComplete,
  });

  // Sync timer reset ref to parent if provided
  useEffect(() => {
    if (resetTimerRef) {
      resetTimerRef.current = reset;
    }
  }, [reset, resetTimerRef]);

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  // Switch to a new mode
  const executeModeSwitch = useCallback(
    (targetMode: TimerMode) => {
      // If user chooses long break, reset the consecutive cycle counter
      if (targetMode === 'longBreak') {
        setConsecutiveFocusSessions(0);
      }

      const newDuration = resolvedDurations[targetMode];
      setCurrentMode(targetMode);
      setLastCompletedSession(null);
      reset(newDuration);
      onModeChange?.(targetMode);
    },
    [onModeChange, reset, resolvedDurations]
  );

  // Handler for user clicking a mode tab
  const handleSelectMode = useCallback(
    (targetMode: TimerMode) => {
      if (targetMode === currentMode && status !== 'completed') return;

      if (status === 'running') {
        // Require user confirmation before interrupting active progress
        setPendingModeSwitch(targetMode);
      } else {
        // When idle, paused, or completed: switch immediately
        executeModeSwitch(targetMode);
      }
    },
    [currentMode, executeModeSwitch, status]
  );

  // Modal confirmation handlers
  const handleConfirmSwitch = useCallback(() => {
    if (pendingModeSwitch) {
      executeModeSwitch(pendingModeSwitch);
      setPendingModeSwitch(null);
    }
  }, [executeModeSwitch, pendingModeSwitch]);

  const handleCancelSwitch = useCallback(() => {
    setPendingModeSwitch(null);
  }, []);

  // Reset current mode's duration
  const handleReset = useCallback(() => {
    reset(currentDuration);
    setLastCompletedSession(null);
  }, [currentDuration, reset]);

  // Keep document title synchronized with mode & time
  useEffect(() => {
    const modeLabel = currentMode === 'focus' ? 'Focusing' : TIMER_MODES[currentMode].label;
    if (status === 'running') {
      document.title = `${formattedTime.display} • ${modeLabel} — Doflow`;
    } else if (status === 'paused') {
      document.title = `Paused (${formattedTime.display}) • ${TIMER_MODES[currentMode].label} — Doflow`;
    } else if (status === 'completed') {
      document.title = `${TIMER_MODES[currentMode].label} Completed! — Doflow`;
    } else {
      document.title = `Doflow — ${TIMER_MODES[currentMode].label} Timer`;
    }
  }, [currentMode, formattedTime.display, status]);

  // Keyboard accessibility: Space to Start/Pause/Resume, R to Reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        pendingModeSwitch !== null ||
        document.querySelector('.modal-backdrop') !== null
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'idle') {
          start();
        } else if (status === 'running') {
          pause();
        } else if (status === 'paused') {
          resume();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (status !== 'idle') {
          e.preventDefault();
          handleReset();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleReset, pause, pendingModeSwitch, resume, start, status]);

  const formattedCurrentDuration = useMemo(
    () => formatMilliseconds(currentDuration).display,
    [currentDuration]
  );

  return (
    <main className="timer-wrapper" role="region" aria-label="Pomodoro Focus Timer">
      <div className="timer-card" data-testid="timer-card">
        {/* Mode Selectors */}
        <div className="card-top">
          <ModeSelector
            currentMode={currentMode}
            onSelectMode={handleSelectMode}
          />
        </div>

        {/* Status Indicator & Cycle Dots */}
        <div className="card-header">
          <TimerStatusBadge status={status} mode={currentMode} />
          <CycleIndicator
            consecutiveFocusCount={consecutiveFocusSessions}
            totalFocusCount={totalFocusSessions}
          />
        </div>

        {/* Large Digital Countdown Display */}
        <div className="card-body">
          <TimerDisplay
            formattedTime={formattedTime}
            progress={progress}
            status={status}
          />

          {activeTask && (
            <div className="current-focus-goal" data-testid="current-focus-goal">
              <span className="goal-indicator" aria-hidden="true" />
              <span className="goal-label">Focus goal:</span>
              <span className="goal-title">{activeTask.title}</span>
            </div>
          )}
        </div>

        {/* Completion Advice / Next Session Suggestion */}
        {status === 'completed' && lastCompletedSession && (
          <SessionSuggestion
            completedMode={lastCompletedSession}
            consecutiveFocusCount={consecutiveFocusSessions}
            onSelectNextMode={executeModeSwitch}
          />
        )}

        {/* Action Controls */}
        <div className="card-footer">
          <TimerControls
            status={status}
            mode={currentMode}
            formattedDuration={formattedCurrentDuration}
            onStart={start}
            onPause={pause}
            onResume={resume}
            onReset={handleReset}
          />

          <div className="keyboard-hints" aria-hidden="true">
            <span className="hint-item">
              <kbd>Space</kbd>{' '}
              {status === 'running'
                ? 'Pause'
                : status === 'paused'
                ? 'Resume'
                : 'Start'}
            </span>
            <span className="hint-divider">•</span>
            <span className="hint-item">
              <kbd>R</kbd> Reset
            </span>
          </div>
        </div>
      </div>

      {/* Confirmation Modal when switching while timer is active */}
      <SwitchModeModal
        isOpen={pendingModeSwitch !== null}
        currentMode={currentMode}
        targetMode={pendingModeSwitch}
        onConfirm={handleConfirmSwitch}
        onCancel={handleCancelSwitch}
      />
    </main>
  );
};
