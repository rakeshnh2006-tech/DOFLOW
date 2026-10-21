export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider: 'google';
  lastLoginAt: number;
  syncedAt: number;
  accountCreatedAt: number;
  givenName?: string;
  familyName?: string;
}

export interface GoogleJwtPayload {
  iss?: string;
  sub: string;
  azp?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  email: string;
  email_verified?: boolean;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export interface GoogleCredentialResponse {
  credential: string;
  select_by?: string;
  clientId?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  error: string | null;
  googleClientId: string;
}
