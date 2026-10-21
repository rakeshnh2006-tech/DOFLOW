import { useCallback, useState } from 'react';
import type { AuthUser, GoogleCredentialResponse } from '../types/auth';
import {
  loadUserFromStorage,
  saveUserToStorage,
  clearUserFromStorage,
  updateUserSyncTimestamp,
  createGoogleUser,
  decodeGoogleJwt,
  createGoogleUserFromJwt,
  getGoogleClientId,
  saveGoogleClientId,
} from '../utils/authStorage';

export interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
  googleClientId: string;
  updateGoogleClientId: (clientId: string) => void;
  handleCredentialResponse: (response: GoogleCredentialResponse) => AuthUser;
  loginWithGoogle: (customParams?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  }) => Promise<AuthUser>;
  logout: () => void;
  syncData: () => Promise<void>;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(() => loadUserFromStorage());
  const [googleClientId, setGoogleClientId] = useState<string>(() => getGoogleClientId());
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const updateGoogleClientId = useCallback((newClientId: string) => {
    saveGoogleClientId(newClientId);
    setGoogleClientId(newClientId.trim());
  }, []);

  const handleCredentialResponse = useCallback((response: GoogleCredentialResponse): AuthUser => {
    try {
      if (!response.credential) {
        throw new Error('No credential token received from Google Identity Services.');
      }

      const payload = decodeGoogleJwt(response.credential);
      if (!payload || !payload.email) {
        throw new Error('Failed to parse Google OAuth identity token payload.');
      }

      const googleUser = createGoogleUserFromJwt(payload);
      saveUserToStorage(googleUser);
      setUser(googleUser);
      setError(null);
      return googleUser;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google OAuth authentication failed';
      setError(message);
      throw err;
    }
  }, []);

  const loginWithGoogle = useCallback(
    async (customParams?: {
      name?: string;
      email?: string;
      avatarUrl?: string;
    }): Promise<AuthUser> => {
      setIsLoading(true);
      setError(null);

      try {
        await new Promise((resolve) => setTimeout(resolve, 400));

        const email = customParams?.email?.trim() || 'user.flow@gmail.com';
        const name = customParams?.name?.trim() || 'Google Flow User';

        if (!email.includes('@') || !email.includes('.')) {
          throw new Error('Please enter a valid Google email address (e.g. yourname@gmail.com)');
        }

        const newUser = createGoogleUser({
          name,
          email,
          avatarUrl: customParams?.avatarUrl,
        });

        saveUserToStorage(newUser);
        setUser(newUser);
        setIsLoading(false);
        return newUser;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Google authentication failed';
        setError(message);
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearUserFromStorage();
    setUser(null);
    setError(null);

    // If Google GIS is active, disable auto select
    if (typeof window !== 'undefined' && (window as unknown as { google?: { accounts?: { id?: { disableAutoSelect?: () => void } } } }).google?.accounts?.id?.disableAutoSelect) {
      try {
        (window as unknown as { google: { accounts: { id: { disableAutoSelect: () => void } } } }).google.accounts.id.disableAutoSelect();
      } catch {
        // Safe fallback
      }
    }
  }, []);

  const syncData = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const now = Date.now();
      const updated = updateUserSyncTimestamp(now);
      if (updated) {
        setUser(updated);
      }
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  return {
    user,
    isAuthenticated: user !== null,
    isLoading,
    isSyncing,
    lastSyncedAt: user?.syncedAt ?? null,
    error,
    googleClientId,
    updateGoogleClientId,
    handleCredentialResponse,
    loginWithGoogle,
    logout,
    syncData,
    clearError,
  };
}
