import React from 'react';
import type { TimerMode } from '../types/timer';

interface SessionSuggestionProps {
  completedMode: TimerMode;
  consecutiveFocusCount: number;
  onSelectNextMode: (mode: TimerMode) => void;
}

export const SessionSuggestion: React.FC<SessionSuggestionProps> = ({
  completedMode,
  consecutiveFocusCount,
  onSelectNextMode,
}) => {
  if (completedMode === 'focus') {
    const isLongBreakDue = consecutiveFocusCount >= 4;

    return (
      <div
        className={`session-suggestion ${isLongBreakDue ? 'suggestion-highlight' : ''}`}
        role="region"
        aria-label="Session completion advice"
        data-testid="session-suggestion"
      >
        <div className="suggestion-content">
          <p className="suggestion-title" data-testid="suggestion-title">
            {isLongBreakDue
              ? '🎉 4 Focus Sessions Completed!'
              : 'Focus Session Completed!'}
          </p>
          <p className="suggestion-text" data-testid="suggestion-message">
            {isLongBreakDue
              ? 'Great effort! A 15-minute long break is recommended to recharge.'
              : `Session ${consecutiveFocusCount} of 4 complete. Time for a 5-minute break.`}
          </p>
        </div>

        <div className="suggestion-actions">
          {isLongBreakDue ? (
            <button
              type="button"
              className="btn btn-primary suggestion-btn"
              onClick={() => onSelectNextMode('longBreak')}
              data-testid="suggest-long-break-button"
            >
              Take Long Break (15m)
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary suggestion-btn"
              onClick={() => onSelectNextMode('shortBreak')}
              data-testid="suggest-short-break-button"
            >
              Take Short Break (5m)
            </button>
          )}
        </div>
      </div>
    );
  }

  if (completedMode === 'shortBreak') {
    return (
      <div
        className="session-suggestion"
        role="region"
        aria-label="Break completion advice"
        data-testid="session-suggestion"
      >
        <div className="suggestion-content">
          <p className="suggestion-title" data-testid="suggestion-title">
            Break Complete!
          </p>
          <p className="suggestion-text" data-testid="suggestion-message">
            Ready to continue? Start session {Math.min(4, consecutiveFocusCount + 1)} of 4.
          </p>
        </div>

        <div className="suggestion-actions">
          <button
            type="button"
            className="btn btn-primary suggestion-btn"
            onClick={() => onSelectNextMode('focus')}
            data-testid="suggest-focus-button"
          >
            Start Focus Session
          </button>
        </div>
      </div>
    );
  }

  // Long break completed
  return (
    <div
      className="session-suggestion suggestion-highlight"
      role="region"
      aria-label="Long break completion advice"
      data-testid="session-suggestion"
    >
      <div className="suggestion-content">
        <p className="suggestion-title" data-testid="suggestion-title">
          Long Break Complete!
        </p>
        <p className="suggestion-text" data-testid="suggestion-message">
          Full 4-session cycle finished. Refreshed and ready for a new focus cycle?
        </p>
      </div>

      <div className="suggestion-actions">
        <button
          type="button"
          className="btn btn-primary suggestion-btn"
          onClick={() => onSelectNextMode('focus')}
          data-testid="suggest-new-cycle-button"
        >
          Start New Focus Cycle
        </button>
      </div>
    </div>
  );
};
