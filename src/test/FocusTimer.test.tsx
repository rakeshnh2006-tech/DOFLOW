import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FocusTimer } from '../components/FocusTimer';

describe('FocusTimer Component UI & Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders initial 25:00 countdown and idle state with proper control states', () => {
    render(<FocusTimer />);

    // Initial display is 25:00
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');
    expect(screen.getByTestId('countdown-minutes')).toHaveTextContent('25');
    expect(screen.getByTestId('countdown-seconds')).toHaveTextContent('00');

    // Status is idle
    const statusBadge = screen.getByTestId('timer-status');
    expect(statusBadge).toHaveAttribute('data-status', 'idle');
    expect(statusBadge).toHaveTextContent(/Ready to focus/i);

    // Start button is visible and enabled
    const startButton = screen.getByTestId('start-button');
    expect(startButton).toBeInTheDocument();
    expect(startButton).toBeEnabled();

    // Pause and Resume buttons are not shown in idle state
    expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resume-button')).not.toBeInTheDocument();

    // Reset button is visible but disabled in idle state
    const resetButton = screen.getByTestId('reset-button');
    expect(resetButton).toBeInTheDocument();
    expect(resetButton).toBeDisabled();
  });

  it('handles Start -> Pause -> Resume -> Reset lifecycle', async () => {
    render(<FocusTimer />);

    // 1. Click Start
    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Verify running state
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');
    expect(screen.queryByTestId('start-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('pause-button')).toBeInTheDocument();
    expect(screen.getByTestId('reset-button')).toBeEnabled();

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:57');

    // 2. Click Pause
    act(() => {
      fireEvent.click(screen.getByTestId('pause-button'));
    });

    // Verify paused state
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'paused');
    expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('resume-button')).toBeInTheDocument();
    expect(screen.getByTestId('reset-button')).toBeEnabled();

    // Advance time while paused - display must remain unchanged
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:57');

    // 3. Click Resume
    act(() => {
      fireEvent.click(screen.getByTestId('resume-button'));
    });

    // Verify resumed running state
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');
    expect(screen.getByTestId('pause-button')).toBeInTheDocument();
    expect(screen.queryByTestId('resume-button')).not.toBeInTheDocument();

    // Advance 2 more seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('24:55');

    // 4. Click Reset
    act(() => {
      fireEvent.click(screen.getByTestId('reset-button'));
    });

    // Verify restored to 25:00 and idle
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');
    expect(screen.getByTestId('start-button')).toBeInTheDocument();
    expect(screen.getByTestId('reset-button')).toBeDisabled();
  });

  it('handles completion with a configurable short test duration and triggers onComplete once', () => {
    const onComplete = vi.fn();
    // 2000ms test duration = 2 seconds
    render(<FocusTimer initialDurationMs={2000} onComplete={onComplete} />);

    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');

    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });

    // Advance to 1 second remaining
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:01');
    expect(onComplete).not.toHaveBeenCalled();

    // Advance 1 more second to reach 0
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:00');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'completed');
    expect(screen.getByTestId('timer-status')).toHaveTextContent(/Session completed/i);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Pause and Resume must NOT be shown when completed
    expect(screen.queryByTestId('pause-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('resume-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('start-button')).not.toBeInTheDocument();

    // Reset button is available to restore initial duration
    const resetButton = screen.getByTestId('reset-button');
    expect(resetButton).toBeEnabled();

    act(() => {
      fireEvent.click(resetButton);
    });

    expect(screen.getByTestId('countdown-display')).toHaveTextContent('00:02');
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');
  });

  it('updates document.title according to timer state', () => {
    render(<FocusTimer initialDurationMs={10000} />);

    expect(document.title).toContain('Doflow');

    act(() => {
      fireEvent.click(screen.getByTestId('start-button'));
    });
    expect(document.title).toContain('Focusing');

    act(() => {
      fireEvent.click(screen.getByTestId('pause-button'));
    });
    expect(document.title).toContain('Paused');

    act(() => {
      fireEvent.click(screen.getByTestId('resume-button'));
    });

    // Advance to 0
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(document.title).toContain('Completed');
  });

  it('supports Space and R keyboard shortcuts', () => {
    render(<FocusTimer />);

    // Press Space to start
    act(() => {
      fireEvent.keyDown(window, { code: 'Space' });
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    // Press Space to pause
    act(() => {
      fireEvent.keyDown(window, { code: 'Space' });
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'paused');

    // Press Space to resume
    act(() => {
      fireEvent.keyDown(window, { code: 'Space' });
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'running');

    // Press R to reset
    act(() => {
      fireEvent.keyDown(window, { key: 'r' });
    });
    expect(screen.getByTestId('timer-status')).toHaveAttribute('data-status', 'idle');
    expect(screen.getByTestId('countdown-display')).toHaveTextContent('25:00');
  });
});
