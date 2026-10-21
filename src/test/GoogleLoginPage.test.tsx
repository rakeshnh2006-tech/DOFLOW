import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GoogleLoginPage } from '../components/GoogleLoginPage';
import { App } from '../App';
import { createGoogleUser, AUTH_USER_STORAGE_KEY } from '../utils/authStorage';
import type { AuthUser } from '../types/auth';

describe('GoogleLoginPage Component', () => {
  const mockLoginWithGoogle = vi.fn();
  const mockUpdateGoogleClientId = vi.fn();
  const mockCredentialResponse = vi.fn();
  const mockLogout = vi.fn();
  const mockSyncData = vi.fn();
  const mockClearError = vi.fn();
  const mockBack = vi.fn();
  const mockNavigateToPrivacy = vi.fn();
  const mockNavigateToTerms = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthenticated View', () => {
    it('renders the Google login page with OAuth 2.0 branding and NO demo accounts', () => {
      render(
        <GoogleLoginPage
          user={null}
          googleClientId="test-client-id.apps.googleusercontent.com"
          onUpdateGoogleClientId={mockUpdateGoogleClientId}
          onCredentialResponse={mockCredentialResponse}
          onLoginWithGoogle={mockLoginWithGoogle}
          onLogout={mockLogout}
          onSyncData={mockSyncData}
          onClearError={mockClearError}
          onBack={mockBack}
          onNavigateToPrivacy={mockNavigateToPrivacy}
          onNavigateToTerms={mockNavigateToTerms}
        />
      );

      expect(screen.getByTestId('google-login-page')).toBeDefined();
      expect(screen.getByRole('heading', { level: 1, name: /Sign in with Google/i })).toBeDefined();
      expect(screen.getByTestId('btn-continue-google')).toBeDefined();
      expect(screen.getByText(/Continue with Google/i)).toBeDefined();
      expect(screen.getByTestId('login-status-signed-out')).toBeDefined();

      // Verify demo profiles are completely removed
      expect(screen.queryByText('Alex Chen')).toBeNull();
      expect(screen.queryByText('Dr. Maya Patel')).toBeNull();
      expect(screen.queryByText('Jordan Lee')).toBeNull();

      // Check client config card exists
      expect(screen.getByTestId('google-client-config-card')).toBeDefined();

      // Check features grid
      expect(screen.getByText(/Seamless Cloud Sync/i)).toBeDefined();
      expect(screen.getByText(/Privacy First/i)).toBeDefined();
      expect(screen.getByText(/Google Verified Security/i)).toBeDefined();

      // Check legal links
      expect(screen.getByTestId('login-privacy-link')).toBeDefined();
      expect(screen.getByTestId('login-terms-link')).toBeDefined();
    });

    it('allows entering and saving Google OAuth Client ID', () => {
      render(
        <GoogleLoginPage
          user={null}
          googleClientId=""
          onUpdateGoogleClientId={mockUpdateGoogleClientId}
          onLoginWithGoogle={mockLoginWithGoogle}
          onLogout={mockLogout}
          onSyncData={mockSyncData}
          onBack={mockBack}
        />
      );

      // Open configuration panel
      const toggleConfigBtn = screen.getByTestId('toggle-client-config-btn');
      fireEvent.click(toggleConfigBtn);

      const clientIdInput = screen.getByTestId('client-id-input');
      const saveBtn = screen.getByTestId('btn-save-client-id');

      fireEvent.change(clientIdInput, {
        target: { value: '987654321-customclient.apps.googleusercontent.com' },
      });
      fireEvent.click(saveBtn);

      expect(mockUpdateGoogleClientId).toHaveBeenCalledWith(
        '987654321-customclient.apps.googleusercontent.com'
      );
    });

    it('triggers onLoginWithGoogle when clicking Continue with Google', () => {
      render(
        <GoogleLoginPage
          user={null}
          onLoginWithGoogle={mockLoginWithGoogle}
          onLogout={mockLogout}
          onSyncData={mockSyncData}
          onBack={mockBack}
        />
      );

      const btn = screen.getByTestId('btn-continue-google');
      fireEvent.click(btn);
      expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1);
    });

    it('validates custom Google email input and submits correctly', async () => {
      mockLoginWithGoogle.mockResolvedValueOnce(
        createGoogleUser({ name: 'Rachel Green', email: 'rachel@gmail.com' })
      );

      render(
        <GoogleLoginPage
          user={null}
          onLoginWithGoogle={mockLoginWithGoogle}
          onLogout={mockLogout}
          onSyncData={mockSyncData}
          onBack={mockBack}
        />
      );

      // Open custom form
      const toggleBtn = screen.getByTestId('toggle-custom-form-btn');
      fireEvent.click(toggleBtn);

      expect(screen.getByTestId('custom-login-form')).toBeDefined();

      const nameInput = screen.getByTestId('custom-name-input');
      const emailInput = screen.getByTestId('custom-email-input');
      const submitBtn = screen.getByTestId('btn-custom-submit');

      fireEvent.change(nameInput, { target: { value: 'Rachel Green' } });
      fireEvent.change(emailInput, { target: { value: 'rachel@gmail.com' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(mockLoginWithGoogle).toHaveBeenCalledWith({
        name: 'Rachel Green',
        email: 'rachel@gmail.com',
      });
    });

    it('navigates back to timer when clicking back button', () => {
      render(
        <GoogleLoginPage
          user={null}
          onLoginWithGoogle={mockLoginWithGoogle}
          onLogout={mockLogout}
          onSyncData={mockSyncData}
          onBack={mockBack}
        />
      );

      const backBtn = screen.getByTestId('login-back-btn');
      fireEvent.click(backBtn);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authenticated View & Cloud Sync Dashboard', () => {
    const mockUser: AuthUser = {
      id: 'google-user-123',
      name: 'Samantha Ray',
      email: 'samantha.ray@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      provider: 'google',
      givenName: 'Samantha',
      familyName: 'Ray',
      lastLoginAt: Date.now() - 3600000,
      syncedAt: Date.now() - 60000,
      accountCreatedAt: Date.now() - 86400000,
    };

    it('renders user profile details, Google badge, and sync status', () => {
      render(
        <GoogleLoginPage
          user={mockUser}
          onLoginWithGoogle={mockLoginWithGoogle}
          onLogout={mockLogout}
          onSyncData={mockSyncData}
          onBack={mockBack}
          statsSummary={{ sessionCount: 14, habitsCount: 5, tasksCount: 8 }}
        />
      );

      expect(screen.getByTestId('auth-user-dashboard')).toBeDefined();
      expect(screen.getByTestId('user-profile-name').textContent).toBe('Samantha Ray');
      expect(screen.getByTestId('user-profile-email').textContent).toBe('samantha.ray@gmail.com');
      expect(screen.getByTestId('login-status-signed-in')).toBeDefined();

      // Stats
      expect(screen.getByText('14')).toBeDefined();
      expect(screen.getByText('5')).toBeDefined();
      expect(screen.getByText('8')).toBeDefined();

      // Cloud Sync Card
      expect(screen.getByTestId('cloud-sync-card')).toBeDefined();
      expect(screen.getByTestId('sync-now-button')).toBeDefined();
    });

    it('triggers sync when clicking Sync Now button', async () => {
      mockSyncData.mockResolvedValueOnce(undefined);

      render(
        <GoogleLoginPage
          user={mockUser}
          onLoginWithGoogle={mockLoginWithGoogle}
          onLogout={mockLogout}
          onSyncData={mockSyncData}
          onBack={mockBack}
        />
      );

      const syncBtn = screen.getByTestId('sync-now-button');
      fireEvent.click(syncBtn);

      expect(mockSyncData).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        expect(screen.getByTestId('sync-success-toast')).toBeDefined();
      });
    });

    it('triggers onLogout when clicking Sign Out button', () => {
      render(
        <GoogleLoginPage
          user={mockUser}
          onLoginWithGoogle={mockLoginWithGoogle}
          onLogout={mockLogout}
          onSyncData={mockSyncData}
          onBack={mockBack}
        />
      );

      const signoutBtn = screen.getByTestId('btn-google-signout');
      fireEvent.click(signoutBtn);
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('triggers onBack when clicking Return to Timer button', () => {
      render(
        <GoogleLoginPage
          user={mockUser}
          onLoginWithGoogle={mockLoginWithGoogle}
          onLogout={mockLogout}
          onSyncData={mockSyncData}
          onBack={mockBack}
        />
      );

      const returnBtn = screen.getByTestId('btn-return-timer');
      fireEvent.click(returnBtn);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Full App Integration with Google Login', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('navigates from Header Google Sign In button to Login Page and back', () => {
      render(<App />);

      expect(screen.getByTestId('timer-card')).toBeDefined();

      const headerLoginBtn = screen.getByTestId('header-google-signin-btn');
      expect(headerLoginBtn).toBeDefined();

      fireEvent.click(headerLoginBtn);

      expect(screen.getByTestId('google-login-page')).toBeDefined();
      expect(screen.getByRole('heading', { level: 1, name: /Sign in with Google/i })).toBeDefined();

      const backBtn = screen.getByTestId('login-back-btn');
      fireEvent.click(backBtn);

      expect(screen.getByTestId('timer-card')).toBeDefined();
    });

    it('persists logged in user state across render and displays profile in header', () => {
      const liveUser = createGoogleUser({
        name: 'Jordan Lee',
        email: 'jordan.lee@gmail.com',
      });
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(liveUser));

      render(<App />);

      expect(screen.queryByTestId('header-google-signin-btn')).toBeNull();
      const profileBtn = screen.getByTestId('header-user-profile-btn');
      expect(profileBtn).toBeDefined();
      expect(profileBtn.textContent).toContain('Jordan');

      fireEvent.click(profileBtn);

      expect(screen.getByTestId('auth-user-dashboard')).toBeDefined();
      expect(screen.getByTestId('user-profile-name').textContent).toBe('Jordan Lee');
    });
  });
});
