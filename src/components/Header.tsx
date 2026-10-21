import React from 'react';
import type { ThemeMode } from '../types/settings';
import type { AuthUser } from '../types/auth';

export type AppView =
  | 'timer'
  | 'planner'
  | 'analytics'
  | 'soundscape'
  | 'habits'
  | 'goals'
  | 'intelligence'
  | 'privacy'
  | 'terms'
  | 'login';

interface HeaderProps {
  currentView?: AppView;
  onNavigate?: (view: AppView) => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  isSoundscapePlaying?: boolean;
  activeSoundscapeName?: string;
  soundscapeEnabled?: boolean;
  user?: AuthUser | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentView = 'timer',
  onNavigate,
  theme = 'light',
  onToggleTheme,
  onOpenSettings,
  isSoundscapePlaying = false,
  soundscapeEnabled = true,
  user = null,
}) => {
  return (
    <header className="app-header" role="banner">
      <div className="brand-container">
        <img
          src="/doflow-icon.png"
          alt="Doflow Icon"
          className="brand-icon"
          width="32"
          height="32"
        />
        <div className="brand-text-group">
          <span className="brand-name">Doflow</span>
          <span className="brand-tagline">Find your flow.</span>
        </div>
      </div>

      {onNavigate && (
        <nav className="header-nav" aria-label="Main application navigation">
          <button
            type="button"
            className={`nav-tab-btn ${currentView === 'timer' ? 'active' : ''}`}
            onClick={() => onNavigate('timer')}
            aria-selected={currentView === 'timer'}
            data-testid="nav-timer"
          >
            Timer
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${currentView === 'planner' ? 'active' : ''}`}
            onClick={() => onNavigate('planner')}
            aria-selected={currentView === 'planner'}
            data-testid="nav-planner"
          >
            Daily Planner
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${currentView === 'analytics' ? 'active' : ''}`}
            onClick={() => onNavigate('analytics')}
            aria-selected={currentView === 'analytics'}
            data-testid="nav-analytics"
          >
            Analytics
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${currentView === 'habits' ? 'active' : ''}`}
            onClick={() => onNavigate('habits')}
            aria-selected={currentView === 'habits'}
            data-testid="nav-habits"
          >
            Habits
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${currentView === 'goals' ? 'active' : ''}`}
            onClick={() => onNavigate('goals')}
            aria-selected={currentView === 'goals'}
            data-testid="nav-goals"
          >
            Goals
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${currentView === 'intelligence' ? 'active' : ''}`}
            onClick={() => onNavigate('intelligence')}
            aria-selected={currentView === 'intelligence'}
            data-testid="nav-intelligence"
          >
            Intelligence
          </button>
          {soundscapeEnabled && (
            <button
              type="button"
              className={`nav-tab-btn ${currentView === 'soundscape' ? 'active' : ''}`}
              onClick={() => onNavigate('soundscape')}
              aria-selected={currentView === 'soundscape'}
              data-testid="nav-soundscape"
            >
              Soundscape
              {isSoundscapePlaying && <span className="nav-playing-dot" title="Audio playing" />}
            </button>
          )}
        </nav>
      )}

      <div className="header-actions">
        {onToggleTheme && (
          <button
            type="button"
            className="btn-header-action"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            data-testid="header-theme-toggle"
          >
            {theme === 'light' ? (
              // Moon icon for switching to dark
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              // Sun icon for switching to light
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        )}

        {onOpenSettings && (
          <button
            type="button"
            className="btn-header-action"
            onClick={onOpenSettings}
            aria-label="Open settings"
            title="Open settings"
            data-testid="settings-button"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}

        {onNavigate &&
          (user ? (
            <button
              type="button"
              className={`btn-header-profile ${currentView === 'login' ? 'active' : ''}`}
              onClick={() => onNavigate('login')}
              aria-label={`Signed in as ${user.name}. Click to view account.`}
              title={`Google Account: ${user.name} (${user.email})`}
              data-testid="header-user-profile-btn"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="header-avatar-img"
                  width="22"
                  height="22"
                />
              ) : (
                <span className="header-avatar-monogram">
                  {(user.name[0] || 'U').toUpperCase()}
                </span>
              )}
              <span className="header-user-firstname">
                {user.givenName || user.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className={`btn-header-login ${currentView === 'login' ? 'active' : ''}`}
              onClick={() => onNavigate('login')}
              aria-label="Sign in with Google"
              title="Sign in with Google"
              data-testid="header-google-signin-btn"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                className="header-google-icon"
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
              <span className="header-login-text">Sign in</span>
            </button>
          ))}
      </div>
    </header>
  );
};
