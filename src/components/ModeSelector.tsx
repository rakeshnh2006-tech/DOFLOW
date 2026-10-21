import React from 'react';
import type { TimerMode } from '../types/timer';
import { TIMER_MODES } from '../types/timer';

interface ModeSelectorProps {
  currentMode: TimerMode;
  onSelectMode: (mode: TimerMode) => void;
  disabled?: boolean;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  disabled = false,
}) => {
  const modes: TimerMode[] = ['focus', 'shortBreak', 'longBreak'];

  return (
    <nav className="mode-selector-nav" aria-label="Timer session modes">
      <div className="mode-selector" role="tablist">
        {modes.map((modeKey) => {
          const mode = TIMER_MODES[modeKey];
          const isActive = currentMode === modeKey;

          return (
            <button
              key={mode.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={mode.ariaLabel}
              className={`mode-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectMode(modeKey)}
              disabled={disabled && !isActive}
              data-testid={`mode-tab-${modeKey}`}
            >
              <span className="mode-label">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
