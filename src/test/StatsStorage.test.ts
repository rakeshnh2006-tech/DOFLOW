import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLocalDateString,
  loadSessionHistoryFromStorage,
  saveSessionHistoryToStorage,
  SESSION_HISTORY_STORAGE_KEY,
} from '../utils/statsStorage';
import type { CompletedSessionRecord } from '../types/stats';

describe('statsStorage Utility & Local Date Boundaries', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  // 1. Local Date String Formatting
  it('formats timestamp as YYYY-MM-DD in user local timezone', () => {
    // Construct local date: 2026-05-15 at 14:30:00
    const localDate = new Date(2026, 4, 15, 14, 30, 0); // month 4 is May
    expect(getLocalDateString(localDate.getTime())).toBe('2026-05-15');

    // Test January (single-digit month padding)
    const janDate = new Date(2026, 0, 5, 9, 0, 0);
    expect(getLocalDateString(janDate.getTime())).toBe('2026-01-05');

    // Test New Year's Eve midnight
    const nyeDate = new Date(2026, 11, 31, 23, 59, 59);
    expect(getLocalDateString(nyeDate.getTime())).toBe('2026-12-31');
  });

  // 2. Storage empty state
  it('returns empty array when session history is empty', () => {
    expect(loadSessionHistoryFromStorage()).toEqual([]);
  });

  // 3. Saving & loading valid records
  it('saves and loads valid session records', () => {
    const sampleRecords: CompletedSessionRecord[] = [
      {
        id: 'rec-1',
        mode: 'focus',
        durationMs: 25 * 60 * 1000,
        completedAt: 1776678000000,
        localDate: '2026-04-20',
      },
      {
        id: 'rec-2',
        mode: 'shortBreak',
        durationMs: 5 * 60 * 1000,
        completedAt: 1776679500000,
        localDate: '2026-04-20',
      },
    ];

    saveSessionHistoryToStorage(sampleRecords);
    const loaded = loadSessionHistoryFromStorage();
    expect(loaded).toEqual(sampleRecords);
    expect(loaded).toHaveLength(2);
  });

  // 4. Corrupted JSON handling
  it('handles invalid JSON in localStorage safely without crashing', () => {
    window.localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, '{{invalid-json--');
    expect(loadSessionHistoryFromStorage()).toEqual([]);
  });

  // 5. Non-array stored values
  it('handles non-array stored data safely', () => {
    window.localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify({ notAnArray: true }));
    expect(loadSessionHistoryFromStorage()).toEqual([]);

    window.localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify('string value'));
    expect(loadSessionHistoryFromStorage()).toEqual([]);
  });

  // 6. Filtering out invalid or partially corrupted items
  it('filters out corrupted items from partially valid session array', () => {
    const mixedRecords = [
      {
        id: 'valid-1',
        mode: 'focus',
        durationMs: 1500000,
        completedAt: 1000,
        localDate: '2026-04-20',
      },
      { id: '', mode: 'focus', durationMs: 1500000 }, // missing fields
      { id: 'bad-mode', mode: 'invalidMode', durationMs: 1500000, completedAt: 1000, localDate: '2026-04-20' }, // invalid mode
      { id: 'zero-duration', mode: 'focus', durationMs: 0, completedAt: 1000, localDate: '2026-04-20' }, // zero duration
      null,
      123,
    ];

    window.localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(mixedRecords));
    const result = loadSessionHistoryFromStorage();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid-1');
  });

  // 7. Storage quota error handling
  it('handles storage write failures gracefully without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => {
      saveSessionHistoryToStorage([
        {
          id: 'rec-1',
          mode: 'focus',
          durationMs: 1500000,
          completedAt: 1000,
          localDate: '2026-04-20',
        },
      ]);
    }).not.toThrow();
  });
});
