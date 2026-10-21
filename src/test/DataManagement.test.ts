import { describe, it, expect, beforeEach } from 'vitest';
import {
  DOFLOW_STORAGE_KEYS,
  inspectStoredDataFootprint,
  clearAllDoflowData,
} from '../utils/dataManagement';
import { TASKS_STORAGE_KEY } from '../utils/taskStorage';
import { SESSION_HISTORY_STORAGE_KEY } from '../utils/statsStorage';
import { PREFERENCES_STORAGE_KEY } from '../utils/settingsStorage';

describe('dataManagement utility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('inspects empty localStorage footprint accurately', () => {
    const summary = inspectStoredDataFootprint();
    expect(summary.totalDoflowKeys).toBe(DOFLOW_STORAGE_KEYS.length);
    expect(summary.activeKeysCount).toBe(0);
    expect(summary.estimatedSizeBytes).toBe(0);
    expect(summary.categories.every((c) => !c.hasData)).toBe(true);
  });

  it('inspects stored items and calculates active keys correctly', () => {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([{ id: '1', title: 'Task 1' }, { id: '2', title: 'Task 2' }]));
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ focusDurationMinutes: 25 }));

    const summary = inspectStoredDataFootprint();
    expect(summary.activeKeysCount).toBe(2);
    expect(summary.estimatedSizeBytes).toBeGreaterThan(0);

    const taskCat = summary.categories.find((c) => c.key === TASKS_STORAGE_KEY);
    expect(taskCat?.hasData).toBe(true);
    expect(taskCat?.itemCount).toBe(2);

    const prefCat = summary.categories.find((c) => c.key === PREFERENCES_STORAGE_KEY);
    expect(prefCat?.hasData).toBe(true);
  });

  it('clears all Doflow keys while preserving non-Doflow origin storage', () => {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([{ id: 't1' }]));
    localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify([{ id: 's1' }]));
    localStorage.setItem('other_app_unrelated_key', 'do_not_delete_this');

    const result = clearAllDoflowData();
    expect(result).toBe(true);

    for (const key of DOFLOW_STORAGE_KEYS) {
      expect(localStorage.getItem(key)).toBeNull();
    }

    // Unrelated origin storage is preserved
    expect(localStorage.getItem('other_app_unrelated_key')).toBe('do_not_delete_this');
  });
});
