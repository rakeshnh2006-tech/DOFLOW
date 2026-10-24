import React, { useEffect, useRef, useState } from 'react';
import type { AuthUser, GoogleCredentialResponse } from '../types/auth';

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number | string;
    }
  ) => void;
  prompt: (notification?: (notification: unknown) => void) => void;
}

interface WindowWithGoogle extends Window {
  google?: {
    accounts?: {
      id?: GoogleAccountsId;
    };
  };
}

export interface GoogleLoginPageProps {
  user: AuthUser | null;
  isLoading?: boolean;
  isSyncing?: boolean;
  error?: string | null;
  googleClientId?: string;
  onUpdateGoogleClientId?: (clientId: string) => void;
  onCredentialResponse?: (response: GoogleCredentialResponse) => void;
  onLoginWithGoogle: (params?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  }) => Promise<AuthUser>;
  onLogout: () => void;
  onSyncData: () => Promise<void>;
  onClearError?: () => void;
  onBack: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
  statsSummary?: {
    sessionCount?: number;
    habitsCount?: number;
    tasksCount?: number;
  };
}

export const GoogleLoginPage: React.FC<GoogleLoginPageProps> = ({
  user,
  isLoading = false,
  isSyncing = false,
  error = null,
  googleClientId = '',
  onUpdateGoogleClientId,
  onCredentialResponse,
  onLoginWithGoogle,
  onLogout,
  onSyncData,
  onClearError,
  onBack,
  onNavigateToPrivacy,
  onNavigateToTerms,
  statsSummary,
}) => {
  const [clientIdInput, setClientIdInput] = useState(googleClientId);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [syncSuccessToast, setSyncSuccessToast] = useState(false);
  const [clientSavedToast, setClientSavedToast] = useState(false);

  const googleButtonContainerRef = useRef<HTMLDivElement | null>(null);

  // Keep input synchronized when prop changes
  const [prevClientIdProp, setPrevClientIdProp] = useState(googleClientId);
  if (googleClientId !== prevClientIdProp) {
    setPrevClientIdProp(googleClientId);
    setClientIdInput(googleClientId);
  }

  // Synchronize Google Identity Services SDK button if available & client ID configured
  useEffect(() => {
    if (user || typeof window === 'undefined') return;

    let isMounted = true;
    let attempts = 0;
    const maxAttempts = 40; // 4 seconds max

    const tryInitGsi = () => {
      if (!isMounted) return false;
      const win = window as WindowWithGoogle;
      const gsi = win.google?.accounts?.id;

      if (gsi && googleClientId.trim() && googleButtonContainerRef.current) {
        try {
          gsi.initialize({
            client_id: googleClientId.trim(),
            callback: (response: GoogleCredentialResponse) => {
              if (onCredentialResponse) {
                onCredentialResponse(response);
              }
            },
          });

          // Clear previous button content
          googleButtonContainerRef.current.innerHTML = '';

          // Render official Google button
          gsi.renderButton(googleButtonContainerRef.current, {
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: 340,
          });
          return true;
        } catch (err) {
          console.warn('Google Identity Services renderButton failed:', err);
          return false;
        }
      }
      return false;
    };

    if (tryInitGsi()) {
      return () => {
        isMounted = false;
      };
    }

    const interval = setInterval(() => {
      attempts += 1;
      if (tryInitGsi() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 100);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user, googleClientId, onCredentialResponse]);

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateGoogleClientId) {
      onUpdateGoogleClientId(clientIdInput.trim());
      setClientSavedToast(true);
      setTimeout(() => setClientSavedToast(false), 2500);
    }
  };

  const handleClearClientId = () => {
    if (onUpdateGoogleClientId) {
      setClientIdInput('');
      onUpdateGoogleClientId('');
      setClientSavedToast(true);
      setTimeout(() => setClientSavedToast(false), 2500);
    }
  };

  const handleEmailFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(null);

    if (!emailInput.trim()) {
      setCustomError('Please enter a Google email address.');
      return;
    }
    if (!emailInput.includes('@') || !emailInput.includes('.')) {
      setCustomError('Please enter a valid Google email address.');
      return;
    }

    try {
      await onLoginWithGoogle({
        name: nameInput.trim() || emailInput.split('@')[0],
        email: emailInput.trim(),
      });
      setEmailInput('');
      setNameInput('');
      setShowEmailForm(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCustomError(err.message);
      }
    }
  };

  const handlePrimaryGoogleClick = () => {
    const win = window as WindowWithGoogle;
    const gsi = win.google?.accounts?.id;

    if (gsi && googleClientId.trim()) {
      // Trigger Google One Tap / Account chooser
      gsi.prompt();
    } else {
      // Direct sign-in or prompt for email
      onLoginWithGoogle();
    }
  };

  const handleSyncClick = async () => {
    try {
      await onSyncData();
      setSyncSuccessToast(true);
      setTimeout(() => setSyncSuccessToast(false), 3000);
    } catch {
      // Handled in hook
    }
  };

  const formatTimestamp = (timestamp?: number | null) => {
    if (!timestamp) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(timestamp));
  };

  return (
    <div className="login-page-container" data-testid="google-login-page">
      {/* 1. Top Header Bar */}
      <div className="login-header-bar">
        <button
          type="button"
          className="btn-back-link"
          onClick={onBack}
          data-testid="login-back-btn"
          aria-label="Back to Timer"
        >
          ← Back to Timer
        </button>
        <div className="login-header-meta">
          <span className="login-oauth-badge">
            <svg
              className="google-badge-icon"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            OAuth 2.0 Client
          </span>
          {user ? (
            <span className="login-status-badge logged-in" data-testid="login-status-signed-in">
              ● Connected
            </span>
          ) : (
            <span className="login-status-badge logged-out" data-testid="login-status-signed-out">
              ○ Not Signed In
            </span>
          )}
        </div>
      </div>

      {/* 2. Error Banner */}
      {(error || customError) && (
        <div className="login-error-alert" role="alert" data-testid="login-error-alert">
          <span className="login-error-icon" aria-hidden="true">⚠️</span>
          <span className="login-error-text">{error || customError}</span>
          {onClearError && (
            <button
              type="button"
              className="login-error-close"
              onClick={() => {
                onClearError();
                setCustomError(null);
              }}
              aria-label="Dismiss error"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* 3. Conditional Content: Authenticated Dashboard vs Login Screen */}
      {user ? (
        /* Authenticated User Dashboard */
        <main className="login-dashboard-content" data-testid="auth-user-dashboard">
          <div className="login-user-card">
            <div className="user-profile-header">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="user-profile-avatar"
                  data-testid="user-avatar-image"
                />
              ) : (
                <div className="user-profile-monogram" data-testid="user-avatar-monogram">
                  {(user.name[0] || 'U').toUpperCase()}
                </div>
              )}
              <div className="user-profile-info">
                <div className="user-name-row">
                  <h1 className="user-full-name" data-testid="user-profile-name">
                    {user.name}
                  </h1>
                  <span className="verified-google-badge" title="Verified Google Account">
                    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Google Account
                  </span>
                </div>
                <p className="user-email-address" data-testid="user-profile-email">
                  {user.email}
                </p>
                <p className="user-meta-subtext">
                  Signed in via Google OAuth 2.0 • Last active {formatTimestamp(user.lastLoginAt)}
                </p>
              </div>
            </div>

            {/* Cloud Sync Status Box */}
            <div className="cloud-sync-card" data-testid="cloud-sync-card">
              <div className="cloud-sync-header">
                <div className="cloud-sync-title-group">
                  <span className="sync-pulse-dot" aria-hidden="true" />
                  <div>
                    <h2 className="cloud-sync-title">Google Cloud Synchronization</h2>
                    <p className="cloud-sync-subtitle">
                      Focus sessions, streak counters, and daily planner data are actively backed up.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`btn-sync-action ${isSyncing ? 'syncing' : ''}`}
                  onClick={handleSyncClick}
                  disabled={isSyncing}
                  data-testid="sync-now-button"
                  aria-label="Sync data with Google Cloud"
                >
                  <svg
                    className={`sync-spin-icon ${isSyncing ? 'spinning' : ''}`}
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
                  </svg>
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>

              {syncSuccessToast && (
                <div className="sync-success-message" role="status" data-testid="sync-success-toast">
                  ✓ Data synchronized successfully with Google Cloud!
                </div>
              )}

              <div className="sync-details-row">
                <span className="sync-detail-label">Last Synchronized:</span>
                <span className="sync-detail-value" data-testid="last-synced-time">
                  {formatTimestamp(user.syncedAt)}
                </span>
              </div>
            </div>

            {/* Productivity Snapshot */}
            <div className="user-stats-grid">
              <div className="user-stat-card">
                <span className="user-stat-num">{statsSummary?.sessionCount ?? 0}</span>
                <span className="user-stat-label">Focus Sessions</span>
              </div>
              <div className="user-stat-card">
                <span className="user-stat-num">{statsSummary?.habitsCount ?? 0}</span>
                <span className="user-stat-label">Active Habits</span>
              </div>
              <div className="user-stat-card">
                <span className="user-stat-num">{statsSummary?.tasksCount ?? 0}</span>
                <span className="user-stat-label">Planner Tasks</span>
              </div>
            </div>

            {/* Actions: Back to Timer / Sign Out */}
            <div className="user-dashboard-actions">
              <button
                type="button"
                className="btn-return-timer"
                onClick={onBack}
                data-testid="btn-return-timer"
              >
                ← Return to Timer
              </button>
              <button
                type="button"
                className="btn-google-signout"
                onClick={onLogout}
                data-testid="btn-google-signout"
              >
                Sign Out
              </button>
            </div>
          </div>
        </main>
      ) : (
        /* Unauthenticated Login Screen */
        <main className="login-main-card" data-testid="google-login-form">
          {/* Logo & Headline */}
          <div className="login-brand-header">
            <div className="login-badge-duo">
              <img
                src="/doflow-icon.png"
                alt="Doflow"
                className="login-doflow-logo"
                width="40"
                height="40"
              />
              <span className="brand-plus" aria-hidden="true">+</span>
              <div className="login-google-circle">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="login-heading">Sign in with Google</h1>
            <p className="login-subheading">
              Connect your Google account to back up your deep work sessions, sync habits across
              browsers, and preserve your flow state everywhere.
            </p>
          </div>

          {/* Google Identity Services Render Container (if GIS active) */}
          <div
            ref={googleButtonContainerRef}
            className="gis-button-wrapper"
            data-testid="gis-button-container"
          />

          {/* Primary Continue with Google Button */}
          <div className="google-cta-container">
            <button
              type="button"
              className="btn-google-primary"
              onClick={handlePrimaryGoogleClick}
              disabled={isLoading}
              data-testid="btn-continue-google"
              aria-label="Continue with Google"
            >
              <div className="google-icon-wrapper">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
              <span className="google-btn-text">
                {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
              </span>
            </button>
            <span className="google-cta-subtext">
              Official Google Identity Services • OAuth 2.0 OpenID Connect
            </span>
          </div>

          {/* Google OAuth Client ID Configuration Box */}
          <div className="client-id-config-card" data-testid="google-client-config-card">
            <button
              type="button"
              className="btn-toggle-config"
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              data-testid="toggle-client-config-btn"
              aria-expanded={showConfigPanel}
            >
              <div className="config-toggle-title">
                <span className="config-icon">⚙️</span>
                <span>Google OAuth Client ID Settings</span>
              </div>
              <span className="config-status-tag">
                {googleClientId ? 'Configured ✓' : 'Add Client ID'}
              </span>
            </button>

            {showConfigPanel && (
              <form
                className="client-config-form"
                onSubmit={handleSaveClientId}
                data-testid="client-id-form"
              >
                <p className="config-instructions">
                  Enter your Google Cloud Console OAuth 2.0 Web Client ID below, or configure it via{' '}
                  <code>VITE_GOOGLE_CLIENT_ID</code> in your <code>.env</code> file.
                </p>
                <div className="form-group">
                  <label htmlFor="client-id-input" className="form-label">
                    Google OAuth Web Client ID
                  </label>
                  <input
                    id="client-id-input"
                    type="text"
                    className="form-input client-id-input"
                    placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    data-testid="client-id-input"
                  />
                </div>
                <div className="config-actions-row">
                  <button
                    type="submit"
                    className="btn-save-client-id"
                    data-testid="btn-save-client-id"
                  >
                    Save Client ID
                  </button>
                  {googleClientId && (
                    <button
                      type="button"
                      className="btn-clear-client-id"
                      onClick={handleClearClientId}
                      data-testid="btn-clear-client-id"
                    >
                      Clear
                    </button>
                  )}
                  {clientSavedToast && (
                    <span className="client-saved-toast" role="status">
                      ✓ Client ID updated!
                    </span>
                  )}
                </div>
                <div className="google-setup-steps">
                  <span className="setup-steps-title">Google Cloud Console Setup Checklist:</span>
                  <ol className="setup-steps-list">
                    <li>
                      Go to{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="setup-external-link"
                      >
                        Google Cloud Console → APIs & Services → Credentials ↗
                      </a>
                    </li>
                    <li>Click <strong>+ CREATE CREDENTIALS</strong> → <strong>OAuth client ID</strong>.</li>
                    <li>Select Application type: <strong>Web application</strong>.</li>
                    <li>
                      Under <strong>Authorized JavaScript origins</strong>, add:
                      <br />
                      <code>http://localhost:5173</code> and <code>http://127.0.0.1:5173</code>
                      <br />
                      <small style={{ color: 'var(--color-text-muted)' }}>
                        ⚠️ Do not include a trailing slash (e.g. <code>http://localhost:5173/</code> will fail).
                      </small>
                    </li>
                    <li>
                      Under <strong>Authorized redirect URIs</strong>, add:
                      <br />
                      <code>http://localhost:5173</code> and <code>http://127.0.0.1:5173</code>
                    </li>
                    <li>Click <strong>Save</strong> and wait 1–2 minutes for Google's servers to propagate.</li>
                    <li>Paste the generated Client ID above or into your local <code>.env</code> file.</li>
                  </ol>
                </div>
              </form>
            )}
          </div>

          {/* Direct Google Account Sign-In Form (for testing / manual email) */}
          <div className="custom-account-expander">
            <button
              type="button"
              className="btn-toggle-custom"
              onClick={() => setShowEmailForm(!showEmailForm)}
              data-testid="toggle-custom-form-btn"
              aria-expanded={showEmailForm}
            >
              <span>{showEmailForm ? '▾' : '▸'} Sign in with specific Google account</span>
            </button>

            {showEmailForm && (
              <form
                className="custom-login-form"
                onSubmit={handleEmailFormSubmit}
                data-testid="custom-login-form"
              >
                <div className="form-group">
                  <label htmlFor="custom-name-input" className="form-label">
                    Full Name (optional)
                  </label>
                  <input
                    id="custom-name-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alex Morgan"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    data-testid="custom-name-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="custom-email-input" className="form-label">
                    Google Email Address
                  </label>
                  <input
                    id="custom-email-input"
                    type="email"
                    className="form-input"
                    placeholder="e.g. yourname@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    data-testid="custom-email-input"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-custom-submit"
                  disabled={isLoading}
                  data-testid="btn-custom-submit"
                >
                  {isLoading ? 'Signing In...' : 'Sign In with Google'}
                </button>
              </form>
            )}
          </div>

          {/* Value Proposition Highlights */}
          <div className="login-features-grid">
            <div className="feature-item">
              <span className="feature-icon" aria-hidden="true">☁️</span>
              <div className="feature-text">
                <span className="feature-title">Seamless Cloud Sync</span>
                <span className="feature-desc">
                  Timer stats and planner sync automatically across all browsers.
                </span>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon" aria-hidden="true">🔒</span>
              <div className="feature-text">
                <span className="feature-title">Privacy First</span>
                <span className="feature-desc">
                  No trackers, no ad networks. Your focus routines belong to you.
                </span>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon" aria-hidden="true">🛡️</span>
              <div className="feature-text">
                <span className="feature-title">Google Verified Security</span>
                <span className="feature-desc">
                  Protected by Google's OAuth 2.0 zero-knowledge login protocol.
                </span>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon" aria-hidden="true">⚡</span>
              <div className="feature-text">
                <span className="feature-title">Offline Resilient</span>
                <span className="feature-desc">
                  Work uninterrupted offline; sync automatically when back online.
                </span>
              </div>
            </div>
          </div>

          {/* Footer terms agreement */}
          <div className="login-legal-footer">
            <p>
              By signing in with Google, you agree to Doflow's{' '}
              {onNavigateToTerms ? (
                <button
                  type="button"
                  className="inline-legal-link"
                  onClick={onNavigateToTerms}
                  data-testid="login-terms-link"
                >
                  Terms & Conditions
                </button>
              ) : (
                'Terms & Conditions'
              )}{' '}
              and{' '}
              {onNavigateToPrivacy ? (
                <button
                  type="button"
                  className="inline-legal-link"
                  onClick={onNavigateToPrivacy}
                  data-testid="login-privacy-link"
                >
                  Privacy Policy
                </button>
              ) : (
                'Privacy Policy'
              )}
              .
            </p>
          </div>
        </main>
      )}
    </div>
  );
};
