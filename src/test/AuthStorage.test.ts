import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AUTH_USER_STORAGE_KEY,
  GOOGLE_CLIENT_ID_STORAGE_KEY,
  loadUserFromStorage,
  saveUserToStorage,
  clearUserFromStorage,
  updateUserSyncTimestamp,
  createGoogleUser,
  getGoogleClientId,
  saveGoogleClientId,
  decodeGoogleJwt,
  createGoogleUserFromJwt,
} from '../utils/authStorage';
import type { GoogleJwtPayload } from '../types/auth';

describe('authStorage utility', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null when no user is stored in localStorage', () => {
    expect(loadUserFromStorage()).toBeNull();
  });

  it('correctly saves and retrieves an AuthUser from localStorage', () => {
    const user = createGoogleUser({
      name: 'Jane Doe',
      email: 'jane.doe@gmail.com',
      avatarUrl: 'https://example.com/avatar.jpg',
    });

    saveUserToStorage(user);
    const loaded = loadUserFromStorage();

    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('Jane Doe');
    expect(loaded?.email).toBe('jane.doe@gmail.com');
    expect(loaded?.provider).toBe('google');
    expect(loaded?.avatarUrl).toBe('https://example.com/avatar.jpg');
    expect(loaded?.givenName).toBe('Jane');
    expect(loaded?.familyName).toBe('Doe');
  });

  it('clears user from localStorage', () => {
    const user = createGoogleUser({
      name: 'Test User',
      email: 'test@gmail.com',
    });

    saveUserToStorage(user);
    expect(loadUserFromStorage()).not.toBeNull();

    clearUserFromStorage();
    expect(loadUserFromStorage()).toBeNull();
    expect(localStorage.getItem(AUTH_USER_STORAGE_KEY)).toBeNull();
  });

  it('updates user sync timestamp accurately', () => {
    const user = createGoogleUser({
      name: 'Sync Tester',
      email: 'sync@gmail.com',
    });
    saveUserToStorage(user);

    const newSyncTime = Date.now() + 50000;
    const updated = updateUserSyncTimestamp(newSyncTime);

    expect(updated).not.toBeNull();
    expect(updated?.syncedAt).toBe(newSyncTime);

    const reloaded = loadUserFromStorage();
    expect(reloaded?.syncedAt).toBe(newSyncTime);
  });

  it('handles corrupted localStorage payload gracefully', () => {
    localStorage.setItem(AUTH_USER_STORAGE_KEY, '{invalid json');
    expect(loadUserFromStorage()).toBeNull();
  });

  it('manages Google OAuth Client ID persistence', () => {
    expect(getGoogleClientId()).toBe('');

    const testClientId = '123456789-abcdef.apps.googleusercontent.com';
    saveGoogleClientId(testClientId);

    expect(getGoogleClientId()).toBe(testClientId);
    expect(localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY)).toBe(testClientId);

    saveGoogleClientId('');
    expect(getGoogleClientId()).toBe('');
    expect(localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY)).toBeNull();
  });

  it('decodes mock Google OAuth JWT tokens correctly', () => {
    const mockPayload: GoogleJwtPayload = {
      sub: 'google-sub-998877',
      name: 'Elena Rostova',
      email: 'elena.rostova@gmail.com',
      picture: 'https://lh3.googleusercontent.com/a/mockphoto',
      given_name: 'Elena',
      family_name: 'Rostova',
    };

    const base64Payload = btoa(JSON.stringify(mockPayload));
    const mockJwt = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.signature`;

    const decoded = decodeGoogleJwt(mockJwt);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe('google-sub-998877');
    expect(decoded?.email).toBe('elena.rostova@gmail.com');
    expect(decoded?.name).toBe('Elena Rostova');

    const authUser = createGoogleUserFromJwt(decoded!);
    expect(authUser.id).toBe('google-sub-998877');
    expect(authUser.email).toBe('elena.rostova@gmail.com');
    expect(authUser.name).toBe('Elena Rostova');
    expect(authUser.givenName).toBe('Elena');
    expect(authUser.familyName).toBe('Rostova');
    expect(authUser.avatarUrl).toBe('https://lh3.googleusercontent.com/a/mockphoto');
  });
});
