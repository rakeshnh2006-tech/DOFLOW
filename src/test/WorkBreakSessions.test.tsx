import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FocusTimer } from '../components/FocusTimer';

describe('FEATURE 2: Work and Break Sessions', () => {
  // Configured short test durations: Focus: 3000ms (3s), Short Break: 2000ms (2s), Long Break: 4000ms (4s)
  const testDurations = {
    focus: 3000,
    shortBreak: 2000,
    longBreak: 4000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // 1. Mode Selectors & Default State
  it('renders three clearly visible mode selectors with default Focus mode duration', () => {
    render(<FocusTimer durations={testDurations} />);

    const focusTab = screen.getByTestId('mode-tab-focus');
    const shortBreakTab = screen.getByTestId('mode-tab-shortBreak');
    const longBreakTab = screen.getByTestId('mode-tab-longBreak');

    expect(focusTab).toBeInTheDocument();
    expect(shortBreakTab).toBeInTheDocument();
    expect(longBreakTab).toBeInTheDocument();

    // Default mode is Focus
    expect(focusTab).toHaveAttribute('aria-selected', 'true');
    expect(shortBreakTab).toHaveAttribute('aria-selected', 'false');
    expect(longBreakTab).toHaveAttribute('aria-selected', 'false');

    // Initial display matches Focus duration (00:03 for 3000ms)
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:03');
    expect(screen.getByTestId('timer-status')).toHaveTextContent(/Ready to focus/i);
  });

  // 2. Default User-Facing Durations (25m, 5m, 15m) when no custom durations are passed
  it('loads default Pomodoro durations when rendered without custom test durations', () => {
    render(<FocusTimer />);

    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');

    // Switch to Short Break while idle
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('05:00');

    // Switch to Long Break while idle
    fireEvent.click(screen.getByTestId('mode-tab-longBreak'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('15:00');
  });

  // 3. Selecting a mode while idle loads that mode's configured duration
  it('switches modes while idle and loads configured duration without starting', () => {
    render(<FocusTimer durations={testDurations} />);

    // Switch to Short Break
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');
    expect(screen.getByTestId('timer-status')).toHaveTextContent(/Ready for short break/i);
    expect(screen.getByTestId('start-button')).toHaveTextContent(/Start Break/i);
    expect(screen.getByTestId('mode-tab-shortBreak')).toHaveAttribute('aria-selected', 'true');

    // Switch to Long Break
    fireEvent.click(screen.getByTestId('mode-tab-longBreak'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:04');
    expect(screen.getByTestId('timer-status')).toHaveTextContent(/Ready for long break/i);
    expect(screen.getByTestId('start-button')).toHaveTextContent(/Start Long Break/i);

    // Switch back to Focus
    fireEvent.click(screen.getByTestId('mode-tab-focus'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:03');
    expect(screen.getByTestId('timer-status')).toHaveTextContent(/Ready to focus/i);

    // Advance time - verify timer does NOT auto-start
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:03');
  });

  // 4. Selecting a mode while paused loads that mode's configured duration
  it('switches modes while paused and loads configured duration in idle state', () => {
    render(<FocusTimer durations={testDurations} />);

    // Start Focus
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');

    // Pause Focus
    act(() => {
      fireEvent.click(screen.getByTestId('pause-button'));
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'paused');

    // Click Short Break while paused
    act(() => {
      fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    });

    // Should immediately load Short Break duration and become idle
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');
    expect(screen.getByTestId('start-button')).toBeInTheDocument();
  });

  // 5. Switching while running requires confirmation to prevent accidental loss
  it('requires confirmation when switching modes while timer is running', () => {
    render(<FocusTimer durations={testDurations} />);

    // Start Focus session
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Attempt to switch to Short Break while running
    act(() => {
      fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    });

    // Confirmation modal should appear
    const modal = screen.getByTestId('confirm-switch-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.getByText(/Switch to Short Break\?/i)).toBeInTheDocument();

    // The countdown must continue running in the background without interruption
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');
  });

  // 6. Cancellation of mode switch preserves progress
  it('cancelling mode switch dismisses modal and keeps timer running in current mode', () => {
    render(<FocusTimer durations={testDurations} />);

    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Click Short Break tab
    act(() => {
      fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    });

    // Click Cancel in modal
    act(() => {
      fireEvent.click(screen.getByTestId('cancel-switch-button'));
    });

    // Modal closes
    expect(screen.queryByTestId('confirm-switch-modal')).not.toBeInTheDocument();

    // Still in Focus mode and running
    expect(screen.getByTestId('mode-tab-focus')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    // Timer continues to tick down
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');
  });

  // 7. Confirming mode switch loads new mode duration
  it('confirming mode switch resets timer and loads target mode duration', () => {
    render(<FocusTimer durations={testDurations} />);

    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Click Short Break tab
    act(() => {
      fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    });

    // Confirm switch
    act(() => {
      fireEvent.click(screen.getByTestId('confirm-switch-button'));
    });

    // Modal closes, switched to Short Break in idle state
    expect(screen.queryByTestId('confirm-switch-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('mode-tab-shortBreak')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');
    expect(screen.getByTestId('start-button')).toBeInTheDocument();
  });

  // 8. Reset restores currently selected mode duration, NOT always Focus
  it('resets to currently selected mode duration (Short Break or Long Break)', () => {
    render(<FocusTimer durations={testDurations} />);

    // Switch to Short Break while idle
    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');

    // Start Short Break
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:01');

    // Reset while in Short Break
    act(() => {
      fireEvent.click(screen.getByTestId('reset-button'));
    });

    // Must restore Short Break duration (00:02), NOT Focus (00:03)!
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');
    expect(screen.getByTestId('mode-tab-shortBreak')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');

    // Switch to Long Break
    fireEvent.click(screen.getByTestId('mode-tab-longBreak'));
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');

    // Reset while in Long Break
    act(() => {
      fireEvent.click(screen.getByTestId('reset-button'));
    });

    // Must restore Long Break duration (00:04)
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:04');
    expect(screen.getByTestId('mode-tab-longBreak')).toHaveAttribute('aria-selected', 'true');
  });

  // 9. Pause and Resume works across all modes
  it('supports pause and resume seamlessly in Short Break mode', () => {
    render(<FocusTimer durations={testDurations} />);

    fireEvent.click(screen.getByTestId('mode-tab-shortBreak'));

    // Start
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:01');

    // Pause
    act(() => {
      fireEvent.click(screen.getByTestId('pause-button'));
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'paused');

    // Advance time while paused
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:01');

    // Resume
    act(() => {
      fireEvent.click(screen.getByTestId('resume-button'));
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:00');
  });

  // 10. Zero-time completion recorded exactly once and does NOT auto-start
  it('records completion once, shows suggestion message, and does not auto-start', () => {
    const onComplete = vi.fn();
    render(<FocusTimer durations={testDurations} onComplete={onComplete} />);

    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Advance to 0
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'completed');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('focus', 3000);

    // Suggestion box is shown recommending Short Break
    expect(screen.getByTestId('session-suggestion')).toBeInTheDocument();
    expect(screen.getByTestId('suggest-short-break-button')).toBeInTheDocument();

    // Further time passage must NOT auto-start another timer or re-trigger completion
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:00');
  });

  // 11. Tracking consecutive focus sessions & 4-session Long Break suggestion
  it('tracks 4 completed focus sessions and suggests a Long Break', () => {
    render(<FocusTimer durations={testDurations} />);

    // Complete Session 1
    act(() => { fireEvent.click(screen.getByTestId('start-button')); });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByTestId('cycle-indicator')).toHaveTextContent(/Session 1 of 4/i);
    expect(screen.getByTestId('suggest-short-break-button')).toBeInTheDocument();

    // Click suggested short break -> then switch back to Focus
    act(() => { fireEvent.click(screen.getByTestId('suggest-short-break-button')); });
    expect(screen.getByTestId('mode-tab-shortBreak')).toHaveAttribute('aria-selected', 'true');
    act(() => { fireEvent.click(screen.getByTestId('mode-tab-focus')); });

    // Complete Session 2
    act(() => { fireEvent.click(screen.getByTestId('start-button')); });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByTestId('cycle-indicator')).toHaveTextContent(/Session 2 of 4/i);
    act(() => { fireEvent.click(screen.getByTestId('mode-tab-focus')); });

    // Complete Session 3
    act(() => { fireEvent.click(screen.getByTestId('start-button')); });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByTestId('cycle-indicator')).toHaveTextContent(/Session 3 of 4/i);
    act(() => { fireEvent.click(screen.getByTestId('mode-tab-focus')); });

    // Complete Session 4
    act(() => { fireEvent.click(screen.getByTestId('start-button')); });
    act(() => { vi.advanceTimersByTime(3000); });

    // After 4th focus session: Long break suggestion must be visible!
    expect(screen.getByTestId('cycle-indicator')).toHaveTextContent(/Cycle complete \(4\/4\)/i);
    expect(screen.getByTestId('suggest-long-break-button')).toBeInTheDocument();
    expect(screen.getByTestId('suggestion-title')).toHaveTextContent(/4 Focus Sessions Completed!/i);

    // Clicking 'Take Long Break' loads Long Break mode
    act(() => {
      fireEvent.click(screen.getByTestId('suggest-long-break-button'));
    });
    expect(screen.getByTestId('mode-tab-longBreak')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:04');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');

    // Starting or taking long break resets the consecutive cycle counter
    expect(screen.getByTestId('cycle-indicator')).toHaveTextContent(/Session 0 of 4/i);
  });

  // 12. Repeated clicking cannot start multiple timers or duplicate events
  it('prevents multiple intervals or corrupted state on repeated clicks', () => {
    render(<FocusTimer durations={testDurations} />);

    // Rapidly click start multiple times
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
      fireEvent.click(screen.getByTestId('start-button'));
      fireEvent.click(screen.getByTestId('start-button'));
    });

    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    // Advance 1 second -> must decrement exactly 1 second (from 3s to 2s)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');
  });
});
