import React, { useEffect, useState } from 'react';
import type { ThemeMode, UserPreferences } from '../types/settings';
import { validateDurationMinutes } from '../types/settings';
import { playCompletionSound } from '../utils/sound';

interface SettingsModalProps {
  isOpen: boolean;
  preferences: UserPreferences;
  onSave: (newPreferences: UserPreferences) => void;
  onClose: () => void;
  soundscapeEnabled?: boolean;
  onToggleSoundscapeEnabled?: (enabled: boolean) => void;
  onNavigateLegal?: (view: 'privacy' | 'terms' | 'login') => void;
}

interface SettingsDialogProps {
  preferences: UserPreferences;
  onSave: (newPreferences: UserPreferences) => void;
  onClose: () => void;
  soundscapeEnabled?: boolean;
  onToggleSoundscapeEnabled?: (enabled: boolean) => void;
  onNavigateLegal?: (view: 'privacy' | 'terms' | 'login') => void;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  preferences,
  onSave,
  onClose,
  soundscapeEnabled = true,
  onToggleSoundscapeEnabled,
  onNavigateLegal,
}) => {
  const [focusInput, setFocusInput] = useState<string>(
    String(preferences.focusDurationMinutes)
  );
  const [shortBreakInput, setShortBreakInput] = useState<string>(
    String(preferences.shortBreakDurationMinutes)
  );
  const [longBreakInput, setLongBreakInput] = useState<string>(
    String(preferences.longBreakDurationMinutes)
  );
  const [themeInput, setThemeInput] = useState<ThemeMode>(preferences.theme);
  const [soundInput, setSoundInput] = useState<boolean>(preferences.soundEnabled);
  const [soundscapeEnabledInput, setSoundscapeEnabledInput] = useState<boolean>(soundscapeEnabled);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Focus Duration
    const focusErr = validateDurationMinutes(focusInput, 'Focus');
    if (focusErr) {
      setValidationError(focusErr);
      return;
    }

    // 2. Validate Short Break Duration
    const shortErr = validateDurationMinutes(shortBreakInput, 'Short break');
    if (shortErr) {
      setValidationError(shortErr);
      return;
    }

    // 3. Validate Long Break Duration
    const longErr = validateDurationMinutes(longBreakInput, 'Long break');
    if (longErr) {
      setValidationError(longErr);
      return;
    }

    setValidationError(null);
    if (onToggleSoundscapeEnabled && soundscapeEnabledInput !== soundscapeEnabled) {
      onToggleSoundscapeEnabled(soundscapeEnabledInput);
    }
    onSave({
      focusDurationMinutes: Number(focusInput),
      shortBreakDurationMinutes: Number(shortBreakInput),
      longBreakDurationMinutes: Number(longBreakInput),
      theme: themeInput,
      soundEnabled: soundInput,
    });
  };

  const handleTestSound = async () => {
    await playCompletionSound();
  };

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      data-testid="settings-modal"
    >
      <div
        className="modal-card settings-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="modal-header">
          <h3 id="settings-title" className="modal-title">
            Timer Preferences
          </h3>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close settings"
            data-testid="cancel-settings-button"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} noValidate>
          {validationError && (
            <div
              className="settings-error-alert"
              role="alert"
              data-testid="settings-error-message"
            >
              {validationError}
            </div>
          )}

          {/* Section 1: Durations */}
          <div className="settings-section">
            <h4 className="settings-section-heading">Durations (minutes)</h4>
            <div className="settings-durations-grid">
              <div className="setting-field">
                <label htmlFor="focus-input" className="setting-label">
                  Focus
                </label>
                <input
                  id="focus-input"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  className="setting-number-input"
                  value={focusInput}
                  onChange={(e) => {
                    setFocusInput(e.target.value);
                    setValidationError(null);
                  }}
                  data-testid="setting-focus-duration"
                />
              </div>

              <div className="setting-field">
                <label htmlFor="short-break-input" className="setting-label">
                  Short Break
                </label>
                <input
                  id="short-break-input"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  className="setting-number-input"
                  value={shortBreakInput}
                  onChange={(e) => {
                    setShortBreakInput(e.target.value);
                    setValidationError(null);
                  }}
                  data-testid="setting-short-break-duration"
                />
              </div>

              <div className="setting-field">
                <label htmlFor="long-break-input" className="setting-label">
                  Long Break
                </label>
                <input
                  id="long-break-input"
                  type="number"
                  min="1"
                  max="120"
                  step="1"
                  className="setting-number-input"
                  value={longBreakInput}
                  onChange={(e) => {
                    setLongBreakInput(e.target.value);
                    setValidationError(null);
                  }}
                  data-testid="setting-long-break-duration"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Appearance / Theme */}
          <div className="settings-section">
            <h4 className="settings-section-heading">Theme</h4>
            <div className="theme-toggle-group" role="radiogroup" aria-label="Theme selection">
              <button
                type="button"
                role="radio"
                aria-checked={themeInput === 'light'}
                className={`theme-btn ${themeInput === 'light' ? 'active' : ''}`}
                onClick={() => setThemeInput('light')}
                data-testid="theme-toggle-light"
              >
                <span>Light</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={themeInput === 'dark'}
                className={`theme-btn ${themeInput === 'dark' ? 'active' : ''}`}
                onClick={() => setThemeInput('dark')}
                data-testid="theme-toggle-dark"
              >
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Section 3: Completion Sound */}
          <div className="settings-section">
            <h4 className="settings-section-heading">Completion Sound</h4>
            <div className="sound-setting-row">
              <label className="sound-toggle-label">
                <input
                  type="checkbox"
                  className="sound-checkbox"
                  checked={soundInput}
                  onChange={(e) => setSoundInput(e.target.checked)}
                  data-testid="setting-sound-toggle"
                />
                <span>Play chime when session completes</span>
              </label>

              <button
                type="button"
                className="btn btn-secondary btn-test-sound"
                onClick={handleTestSound}
                data-testid="test-sound-button"
              >
                Preview Chime
              </button>
            </div>
          </div>

          {/* Section 4: Focus Soundscape Availability */}
          {onToggleSoundscapeEnabled && (
            <div className="settings-section">
              <h4 className="settings-section-heading">Focus Soundscape</h4>
              <div className="sound-setting-row">
                <label className="sound-toggle-label">
                  <input
                    type="checkbox"
                    className="sound-checkbox"
                    checked={soundscapeEnabledInput}
                    onChange={(e) => setSoundscapeEnabledInput(e.target.checked)}
                    data-testid="setting-soundscape-toggle"
                  />
                  <span>Enable Focus Soundscape ambient audio</span>
                </label>
              </div>
            </div>
          )}

          {/* Section 5: Legal & Privacy */}
          <div className="settings-section">
            <h4 className="settings-section-heading">Legal &amp; Privacy</h4>
            <p className="settings-section-desc">
              Doflow stores your data 100% locally on this device with zero trackers or external servers.
            </p>
            <div className="settings-legal-links-row">
              <button
                type="button"
                className="btn-settings-legal-link"
                onClick={() => {
                  onClose();
                  onNavigateLegal?.('login');
                }}
                data-testid="settings-login-link"
              >
                Google Account &amp; Sync →
              </button>
              <button
                type="button"
                className="btn-settings-legal-link"
                onClick={() => {
                  onClose();
                  onNavigateLegal?.('privacy');
                }}
                data-testid="settings-privacy-link"
              >
                Privacy Policy →
              </button>
              <button
                type="button"
                className="btn-settings-legal-link"
                onClick={() => {
                  onClose();
                  onNavigateLegal?.('terms');
                }}
                data-testid="settings-terms-link"
              >
                Terms &amp; Conditions →
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="modal-actions settings-actions">
            <button
              type="button"
              className="btn btn-secondary modal-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary modal-btn"
              data-testid="save-settings-button"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  preferences,
  onSave,
  onClose,
  soundscapeEnabled,
  onToggleSoundscapeEnabled,
  onNavigateLegal,
}) => {
  if (!isOpen) return null;

  return (
    <SettingsDialog
      preferences={preferences}
      onSave={onSave}
      onClose={onClose}
      soundscapeEnabled={soundscapeEnabled}
      onToggleSoundscapeEnabled={onToggleSoundscapeEnabled}
      onNavigateLegal={onNavigateLegal}
    />
  );
};

