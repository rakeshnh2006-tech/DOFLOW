import type { AuthUser, GoogleJwtPayload } from '../types/auth';

export const AUTH_USER_STORAGE_KEY = 'doflow_auth_user';
export const GOOGLE_CLIENT_ID_STORAGE_KEY = 'doflow_google_client_id';

export function getGoogleClientId(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return '';
  }

  const stored = window.localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY);
  if (stored && stored.trim().length > 0) {
    return stored.trim();
  }

  // Fallback to environment variable if configured (ignore unconfigured template placeholder)
  try {
    const envVal = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
    if (envVal.includes('your-google-client-id') || (import.meta.env.MODE === 'test' && !window.localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY))) {
      return '';
    }
    return envVal;
  } catch {
    return '';
  }
}

export function saveGoogleClientId(clientId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    const cleaned = clientId.trim();
    if (cleaned) {
      window.localStorage.setItem(GOOGLE_CLIENT_ID_STORAGE_KEY, cleaned);
    } else {
      window.localStorage.removeItem(GOOGLE_CLIENT_ID_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Failed to save Google Client ID:', error);
  }
}

export function decodeGoogleJwt(token: string): GoogleJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    
    // Replace URL-safe base64 characters
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as GoogleJwtPayload;
  } catch (error) {
    console.error('Failed to decode Google JWT token:', error);
    return null;
  }
}

export function createGoogleUserFromJwt(payload: GoogleJwtPayload): AuthUser {
  const now = Date.now();
  return {
    id: payload.sub || `google-${payload.email}-${now}`,
    name: payload.name || payload.email.split('@')[0],
    email: payload.email.toLowerCase(),
    avatarUrl: payload.picture,
    provider: 'google',
    givenName: payload.given_name || payload.name?.split(' ')[0] || 'Google',
    familyName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || 'User',
    lastLoginAt: now,
    syncedAt: now,
    accountCreatedAt: now,
  };
}

export function loadUserFromStorage(): AuthUser | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.email && parsed.provider === 'google') {
      return parsed as AuthUser;
    }
    return null;
  } catch (error) {
    console.error('Failed to load user from localStorage:', error);
    return null;
  }
}

export function saveUserToStorage(user: AuthUser): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to save user to localStorage:', error);
  }
}

export function clearUserFromStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear user from localStorage:', error);
  }
}

export function updateUserSyncTimestamp(timestamp: number = Date.now()): AuthUser | null {
  const current = loadUserFromStorage();
  if (!current) return null;

  const updated: AuthUser = {
    ...current,
    syncedAt: timestamp,
  };
  saveUserToStorage(updated);
  return updated;
}

export function createGoogleUser(params: {
  name: string;
  email: string;
  avatarUrl?: string;
  givenName?: string;
  familyName?: string;
}): AuthUser {
  const now = Date.now();
  const parts = params.name.trim().split(/\s+/);
  const givenName = params.givenName || parts[0] || 'Flow';
  const familyName = params.familyName || (parts.length > 1 ? parts.slice(1).join(' ') : 'User');

  return {
    id: `google-${params.email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${now}`,
    name: params.name.trim() || 'Google User',
    email: params.email.trim().toLowerCase(),
    avatarUrl: params.avatarUrl,
    provider: 'google',
    givenName,
    familyName,
    lastLoginAt: now,
    syncedAt: now,
    accountCreatedAt: now,
  };
}
