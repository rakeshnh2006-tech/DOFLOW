import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimer, formatMilliseconds, DEFAULT_FOCUS_DURATION_MS } from '../hooks/useTimer';

describe('useTimer Engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  // Requirement 1: The initial duration is 25:00
  it('initializes with default duration of 25:00 (1,500,000 ms)', () => {
    const { result } = renderHook(() => useTimer());

    expect(result.current.status).toBe('idle');
    expect(result.current.durationMs).toBe(DEFAULT_FOCUS_DURATION_MS);
    expect(result.current.remainingMs).toBe(DEFAULT_FOCUS_DURATION_MS);
    expect(result.current.formattedTime.minutes).toBe('25');
    expect(result.current.formattedTime.seconds).toBe('00');
    expect(result.current.formattedTime.display).toBe('25:00');
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isRunning).toBe(false);
  });

  // Requirement 2: Start begins the countdown
  it('starts countdown and decrements time accurately based on deadline', () => {
    const { result } = renderHook(() => useTimer({ tickIntervalMs: 100 }));

    act(() => {
      result.current.start();
    });

    expect(result.current.status).toBe('running');
    expect(result.current.isRunning).toBe(true);

    // Advance 1000ms (1 second)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // 25:00 minus 1000ms is 24:59
    expect(result.current.formattedTime.display).toBe('24:59');
    expect(result.current.remainingMs).toBe(DEFAULT_FOCUS_DURATION_MS - 1000);

    // Advance 60 seconds (60,000ms)
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(result.current.formattedTime.display).toBe('23:59');
  });

  // Requirement 3: Pause stops countdown progression
  it('pauses countdown and preserves the exact remaining time', () => {
    const { result } = renderHook(() => useTimer({ tickIntervalMs: 100 }));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(5000); // 5 seconds elapsed
    });

    expect(result.current.formattedTime.display).toBe('24:55');

    act(() => {
      result.current.pause();
    });

    expect(result.current.status).toBe('paused');
    expect(result.current.isPaused).toBe(true);
    const pausedTime = result.current.remainingMs;

    // Advance time while paused
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Time must NOT advance while paused
    expect(result.current.remainingMs).toBe(pausedTime);
    expect(result.current.formattedTime.display).toBe('24:55');
  });

  // Requirement 4: Resume continues from the remaining time
  it('resumes countdown from the preserved remaining time without jumping', () => {
    const { result } = renderHook(() => useTimer({ tickIntervalMs: 100 }));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(10000); // 10s elapsed -> 24:50
    });

    act(() => {
      result.current.pause();
    });

    expect(result.current.formattedTime.display).toBe('24:50');

    // Wait a while in paused state
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Resume
    act(() => {
      result.current.resume();
    });

    expect(result.current.status).toBe('running');

    // Advance 5 seconds after resume
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.formattedTime.display).toBe('24:45');
    expect(result.current.remainingMs).toBe(DEFAULT_FOCUS_DURATION_MS - 15000);
  });

  // Requirement 5: Reset restores 25:00
  it('resets timer back to initial duration from running or paused state', () => {
    const { result } = renderHook(() => useTimer({ tickIntervalMs: 100 }));

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(120000); // 2 minutes
    });

    expect(result.current.formattedTime.display).toBe('23:00');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.isIdle).toBe(true);
    expect(result.current.remainingMs).toBe(DEFAULT_FOCUS_DURATION_MS);
    expect(result.current.formattedTime.display).toBe('25:00');

    // Verify it doesn't tick after reset
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.remainingMs).toBe(DEFAULT_FOCUS_DURATION_MS);
  });

  // Requirement 6: Completion at zero happens only once
  it('transitions to completed at zero and calls onComplete exactly once', () => {
    const onComplete = vi.fn();
    // Use short duration for completion testing (e.g. 3 seconds = 3000ms)
    const { result } = renderHook(() =>
      useTimer({ initialDurationMs: 3000, tickIntervalMs: 100, onComplete })
    );

    act(() => {
      result.current.start();
    });

    // Advance 2 seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.formattedTime.display).toBe('00:01');
    expect(onComplete).not.toHaveBeenCalled();

    // Advance another 1 second to reach 0
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.status).toBe('completed');
    expect(result.current.isCompleted).toBe(true);
    expect(result.current.remainingMs).toBe(0);
    expect(result.current.formattedTime.display).toBe('00:00');
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Advancing further should NOT re-trigger onComplete
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.remainingMs).toBe(0);
  });

  // Requirement 7: The timer never becomes negative
  it('never allows remaining time or display to become negative', () => {
    const { result } = renderHook(() =>
      useTimer({ initialDurationMs: 2000, tickIntervalMs: 100 })
    );

    act(() => {
      result.current.start();
    });

    // Advance by 10 seconds (way past the 2 second duration)
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.remainingMs).toBe(0);
    expect(result.current.remainingMs).toBeGreaterThanOrEqual(0);
    expect(result.current.formattedTime.display).toBe('00:00');
    expect(result.current.formattedTime.minutes).toBe('00');
    expect(result.current.formattedTime.seconds).toBe('00');
  });

  // Requirement 8: Switching browser tabs does not cause countdown drift
  it('handles tab switching and delays without countdown drift', () => {
    const { result } = renderHook(() => useTimer({ tickIntervalMs: 100 }));

    act(() => {
      result.current.start();
    });

    // Simulate tab being hidden and backgrounded for 300 seconds (5 minutes)
    // where setInterval might be throttled or delayed
    act(() => {
      vi.advanceTimersByTime(300000);
    });

    // Simulate tab becoming visible again
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // 25:00 - 5 minutes = exactly 20:00
    expect(result.current.formattedTime.display).toBe('20:00');
    expect(result.current.remainingMs).toBe(DEFAULT_FOCUS_DURATION_MS - 300000);
  });

  // Requirement 9: Repeated clicking cannot start multiple concurrent timers
  it('prevents multiple concurrent intervals when start is clicked repeatedly', () => {
    const { result } = renderHook(() => useTimer({ tickIntervalMs: 100 }));

    // Click start 5 times in a row
    act(() => {
      result.current.start();
      result.current.start();
      result.current.start();
      result.current.start();
      result.current.start();
    });

    expect(result.current.status).toBe('running');

    // Advance 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // If duplicate timers were running, remaining time would decrement faster than 1000ms.
    // It must decrement by EXACTLY 1000ms.
    expect(result.current.remainingMs).toBe(DEFAULT_FOCUS_DURATION_MS - 1000);
    expect(result.current.formattedTime.display).toBe('24:59');
  });

  // Cleanup testing: Cleans up timer resources on unmount
  it('cleans up interval resources when unmounted', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const { result, unmount } = renderHook(() => useTimer());

    act(() => {
      result.current.start();
    });

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  // Time formatter unit tests
  describe('formatMilliseconds', () => {
    it('formats exact minutes and seconds', () => {
      expect(formatMilliseconds(1500000).display).toBe('25:00');
      expect(formatMilliseconds(60000).display).toBe('01:00');
      expect(formatMilliseconds(59000).display).toBe('00:59');
      expect(formatMilliseconds(1000).display).toBe('00:01');
      expect(formatMilliseconds(0).display).toBe('00:00');
    });

    it('clamps negative values to 00:00', () => {
      expect(formatMilliseconds(-5000).display).toBe('00:00');
    });
  });
});
