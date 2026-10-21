import React from 'react';
import type { TimerMode, TimerStatus } from '../types/timer';

interface TimerStatusBadgeProps {
  status: TimerStatus;
  mode?: TimerMode;
}

export const TimerStatusBadge: React.FC<TimerStatusBadgeProps> = ({
  status,
  mode = 'focus',
}) => {
  let label = 'Ready to focus';
  let ariaText = 'Timer is idle, ready to focus';

  if (mode === 'focus') {
    if (status === 'running') {
      label = 'Focus session in progress';
      ariaText = 'Timer is running, focus session in progress';
    } else if (status === 'paused') {
      label = 'Session paused';
      ariaText = 'Timer is paused';
    } else if (status === 'completed') {
      label = 'Session completed';
      ariaText = 'Focus session completed! Well done.';
    }
  } else if (mode === 'shortBreak') {
    if (status === 'idle') {
      label = 'Ready for short break';
      ariaText = 'Ready for short break';
    } else if (status === 'running') {
      label = 'Short break in progress';
      ariaText = 'Short break in progress';
    } else if (status === 'paused') {
      label = 'Break paused';
      ariaText = 'Short break is paused';
    } else if (status === 'completed') {
      label = 'Short break completed';
      ariaText = 'Short break completed! Ready to focus.';
    }
  } else if (mode === 'longBreak') {
    if (status === 'idle') {
      label = 'Ready for long break';
      ariaText = 'Ready for long break';
    } else if (status === 'running') {
      label = 'Long break in progress';
      ariaText = 'Long break in progress';
    } else if (status === 'paused') {
      label = 'Long break paused';
      ariaText = 'Long break is paused';
    } else if (status === 'completed') {
      label = 'Long break completed';
      ariaText = 'Long break completed! Refreshed and ready.';
    }
  }

  const modifier = `status-${status}`;

  return (
    <div
      className={`status-badge ${modifier}`}
      role="status"
      aria-live="polite"
      aria-label={ariaText}
      data-testid="timer-status"
      data-status={status}
      data-mode={mode}
    >
      <span className="status-dot" aria-hidden="true" />
      <span className="status-label">{label}</span>
    </div>
  );
};
