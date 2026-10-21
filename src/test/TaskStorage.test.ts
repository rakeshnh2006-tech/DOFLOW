import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadTasksFromStorage,
  saveTasksToStorage,
  loadActiveTaskId,
  saveActiveTaskId,
  TASKS_STORAGE_KEY,
} from '../utils/taskStorage';
import type { Task } from '../types/task';

describe('taskStorage Utility & Corrupted Data Handling', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns empty array when storage is empty', () => {
    expect(loadTasksFromStorage()).toEqual([]);
    expect(loadActiveTaskId()).toBeNull();
  });

  it('saves and loads valid tasks from localStorage', () => {
    const sampleTasks: Task[] = [
      { id: 'task-1', title: 'Write tests', completed: false, createdAt: 1000 },
      { id: 'task-2', title: 'Review code', completed: true, createdAt: 2000 },
    ];

    saveTasksToStorage(sampleTasks);
    saveActiveTaskId('task-1');

    const loaded = loadTasksFromStorage();
    expect(loaded).toHaveLength(2);
    expect(loaded).toEqual(sampleTasks);
    expect(loadActiveTaskId()).toBe('task-1');
  });

  // Corrupted stored data tests
  it('safely handles non-JSON corrupted strings in localStorage without crashing', () => {
    window.localStorage.setItem(TASKS_STORAGE_KEY, '{{corrupt-json-string***');

    const result = loadTasksFromStorage();
    expect(result).toEqual([]);
  });

  it('safely handles non-array stored values in localStorage without crashing', () => {
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ notAnArray: true }));
    expect(loadTasksFromStorage()).toEqual([]);

    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify('just a string'));
    expect(loadTasksFromStorage()).toEqual([]);

    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(12345));
    expect(loadTasksFromStorage()).toEqual([]);
  });

  it('filters out invalid or partially corrupted items from stored array', () => {
    const mixedArray = [
      { id: 'valid-1', title: 'Valid task', completed: false, createdAt: 123 },
      { id: '', title: 'Missing id', completed: false }, // invalid id
      { id: 'no-title', completed: true }, // missing title
      { id: 'not-boolean', title: 'Bad completed', completed: 'yes' }, // invalid boolean
      null,
      undefined,
      123,
    ];

    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(mixedArray));

    const result = loadTasksFromStorage();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('valid-1');
    expect(result[0].title).toBe('Valid task');
  });

  it('safely handles storage quota or write errors gracefully without crashing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    // Calling saveTasksToStorage should not throw
    expect(() => {
      saveTasksToStorage([{ id: '1', title: 'Test', completed: false, createdAt: 1 }]);
    }).not.toThrow();

    expect(() => {
      saveActiveTaskId('1');
    }).not.toThrow();
  });
});
