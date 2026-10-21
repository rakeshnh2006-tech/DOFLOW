import React from 'react';
import type { FormattedTime, TimerStatus } from '../types/timer';

interface TimerDisplayProps {
  formattedTime: FormattedTime;
  progress: number;
  status: TimerStatus;
}

export const TimerDisplay: React.FC<TimerDisplayProps> = ({
  formattedTime,
  progress,
  status,
}) => {
  const { minutes, seconds, display } = formattedTime;

  return (
    <div className={`timer-display-container ${status}`} data-testid="timer-display-container">
      <div className="countdown-wrapper">
        <time
          className="countdown-digits"
          dateTime={`PT${minutes}M${seconds}S`}
          aria-label={`${minutes} minutes and ${seconds} seconds remaining`}
          data-testid="countdown-display"
        >
          <span className="digit-segment minutes" data-testid="countdown-minutes">
            {minutes}
          </span>
          <span className="digit-separator" aria-hidden="true">
            :
          </span>
          <span className="digit-segment seconds" data-testid="countdown-seconds">
            {seconds}
          </span>
        </time>
      </div>

      {/* Minimal progress rail */}
      <div
        className="progress-rail"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Focus timer progress"
      >
        <div
          className="progress-bar"
          style={{ width: `${Math.round(progress * 100)}%` }}
          data-testid="progress-bar"
        />
      </div>

      <span className="sr-only">Current display: {display}</span>
    </div>
  );
};
