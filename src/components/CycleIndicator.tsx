import React from 'react';

interface CycleIndicatorProps {
  consecutiveFocusCount: number;
  totalFocusCount: number;
}

export const CycleIndicator: React.FC<CycleIndicatorProps> = ({
  consecutiveFocusCount,
  totalFocusCount,
}) => {
  const currentStep = consecutiveFocusCount % 4;
  const isCycleCompleted = consecutiveFocusCount > 0 && consecutiveFocusCount % 4 === 0;

  return (
    <div
      className="cycle-indicator"
      role="group"
      aria-label={`Pomodoro cycle progress: ${consecutiveFocusCount % 4 || (isCycleCompleted ? 4 : 0)} of 4 sessions`}
      data-testid="cycle-indicator"
    >
      <div className="cycle-dots" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => {
          const isFilled = isCycleCompleted ? true : step <= currentStep;
          return (
            <span
              key={step}
              className={`cycle-dot ${isFilled ? 'filled' : ''}`}
              data-testid={`cycle-dot-${step}`}
            />
          );
        })}
      </div>
      <span className="cycle-label">
        {isCycleCompleted
          ? 'Cycle complete (4/4)'
          : `Session ${currentStep} of 4`}
        {totalFocusCount > 0 && (
          <span className="total-sessions"> • Total: {totalFocusCount}</span>
        )}
      </span>
    </div>
  );
};
