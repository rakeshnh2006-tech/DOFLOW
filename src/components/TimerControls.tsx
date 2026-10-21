import React from 'react';
import type { TimerMode, TimerStatus } from '../types/timer';
import { TIMER_MODES } from '../types/timer';

interface TimerControlsProps {
  status: TimerStatus;
  mode?: TimerMode;
  formattedDuration?: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  status,
  mode = 'focus',
  formattedDuration = '25:00',
  onStart,
  onPause,
  onResume,
  onReset,
}) => {
  const isIdle = status === 'idle';
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';

  const modeConfig = TIMER_MODES[mode];
  const startButtonText =
    mode === 'focus'
      ? 'Start Focus'
      : mode === 'shortBreak'
      ? 'Start Break'
      : 'Start Long Break';

  return (
    <div className="timer-controls" role="group" aria-label="Timer controls">
      {/* 1. Start Button (visible only when idle) */}
      {isIdle && (
        <button
          type="button"
          className="btn btn-primary btn-start"
          onClick={onStart}
          aria-label={`Start ${modeConfig.label} countdown`}
          data-testid="start-button"
        >
          <svg
            className="btn-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            width="18"
            height="18"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>{startButtonText}</span>
        </button>
      )}

      {/* 2. Pause Button (visible only when running) */}
      {isRunning && (
        <button
          type="button"
          className="btn btn-secondary btn-pause"
          onClick={onPause}
          aria-label="Pause countdown"
          data-testid="pause-button"
        >
          <svg
            className="btn-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            width="18"
            height="18"
          >
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <span>Pause</span>
        </button>
      )}

      {/* 3. Resume Button (visible only when paused) */}
      {isPaused && (
        <button
          type="button"
          className="btn btn-primary btn-resume"
          onClick={onResume}
          aria-label="Resume countdown"
          data-testid="resume-button"
        >
          <svg
            className="btn-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            width="18"
            height="18"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>Resume</span>
        </button>
      )}

      {/* 4. Reset Button:
          - Enabled when running, paused, or completed.
          - Disabled when already idle at original duration.
      */}
      <button
        type="button"
        className={`btn btn-secondary btn-reset ${isCompleted ? 'btn-primary-reset' : ''}`}
        onClick={onReset}
        disabled={isIdle}
        aria-label={`Reset timer to ${formattedDuration}`}
        data-testid="reset-button"
      >
        <svg
          className="btn-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          width="18"
          height="18"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
        <span>{isCompleted ? `Reset to ${formattedDuration}` : 'Reset'}</span>
      </button>
    </div>
  );
};
