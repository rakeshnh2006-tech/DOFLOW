import { describe, it, expect, beforeEach } from 'vitest';
import {
  SESSION_REFLECTIONS_STORAGE_KEY,
  loadReflectionsFromStorage,
  saveReflectionsToStorage,
  saveSessionReflection,
  getReflectionForSession,
} from '../utils/reflectionStorage';
import type { SessionReflection } from '../types/intelligence';

describe('reflectionStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleReflection1: SessionReflection = {
    sessionId: 'session-101',
    completedAt: 1714000000000,
    localDate: '2026-10-20',
    quality: 'productive',
    note: 'Deep focus on coding',
  };

  const sampleReflection2: SessionReflection = {
    sessionId: 'session-102',
    completedAt: 1714003600000,
    localDate: '2026-10-20',
    quality: 'distracted',
    note: 'Notifications pinging',
  };

  it('loads an empty array when localStorage is empty', () => {
    expect(loadReflectionsFromStorage()).toEqual([]);
  });

  it('safely saves and loads session reflections', () => {
    saveReflectionsToStorage([sampleReflection1, sampleReflection2]);
    const loaded = loadReflectionsFromStorage();
    expect(loaded).toHaveLength(2);
    expect(loaded[0]).toEqual(sampleReflection1);
    expect(loaded[1]).toEqual(sampleReflection2);
  });

  it('prevents duplicate reflections for the same sessionId and updates existing', () => {
    saveSessionReflection(sampleReflection1);
    expect(loadReflectionsFromStorage()).toHaveLength(1);

    const updatedReflection1: SessionReflection = {
      ...sampleReflection1,
      quality: 'interrupted',
      note: 'Doorbell rang',
    };

    saveSessionReflection(updatedReflection1);
    const loaded = loadReflectionsFromStorage();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].quality).toBe('interrupted');
    expect(loaded[0].note).toBe('Doorbell rang');
  });

  it('retrieves a reflection by session ID', () => {
    saveSessionReflection(sampleReflection1);
    saveSessionReflection(sampleReflection2);

    expect(getReflectionForSession('session-101')).toEqual(sampleReflection1);
    expect(getReflectionForSession('session-102')).toEqual(sampleReflection2);
    expect(getReflectionForSession('session-nonexistent')).toBeNull();
  });

  it('handles corrupted JSON in localStorage gracefully without throwing', () => {
    localStorage.setItem(SESSION_REFLECTIONS_STORAGE_KEY, '{invalid json:');
    expect(loadReflectionsFromStorage()).toEqual([]);
  });

  it('filters out invalid or malformed reflection objects from storage', () => {
    const invalidItems = [
      null,
      'not an object',
      { sessionId: '123' }, // missing completedAt, localDate, quality
      { sessionId: '', completedAt: 12345, localDate: '2026-10-20', quality: 'productive' }, // empty sessionId
      { sessionId: 'ok-1', completedAt: 'not-a-number', localDate: '2026-10-20', quality: 'productive' },
      { sessionId: 'ok-2', completedAt: 12345, localDate: 'invalid-date', quality: 'productive' },
      { sessionId: 'ok-3', completedAt: 12345, localDate: '2026-10-20', quality: 'super_awesome' }, // invalid quality
      sampleReflection1, // 1 valid entry
    ];

    localStorage.setItem(
      SESSION_REFLECTIONS_STORAGE_KEY,
      JSON.stringify(invalidItems)
    );

    const loaded = loadReflectionsFromStorage();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(sampleReflection1);
  });
});
