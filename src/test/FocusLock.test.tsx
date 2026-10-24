import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFocusLock } from '../hooks/useFocusLock';
import { FocusLockModal } from '../components/FocusLockModal';
import { FocusLockBanner } from '../components/FocusLockBanner';
import { FocusLockEndEarlyModal } from '../components/FocusLockEndEarlyModal';
import { FOCUS_LOCK_STORAGE_KEY } from '../utils/focusLockStorage';
import { DEFAULT_FOCUS_LOCK_SETTINGS } from '../types/focusLock';

function TestFocusLockConsumer() {
  const focusLock = useFocusLock();

  return (
    <div>
      <span data-testid="selected-count">{focusLock.selectedAppsCount}</span>
      <span data-testid="is-locked">{String(focusLock.isLocked)}</span>
      <button
        onClick={() => focusLock.startSessionLock(25 * 60 * 1000, 'Test Focus')}
        data-testid="btn-start-lock"
      >
        Start Lock
      </button>
      <button onClick={() => focusLock.endSessionLock()} data-testid="btn-end-lock">
        End Lock
      </button>
      <button
        onClick={() => focusLock.toggleApp('instagram')}
        data-testid="btn-toggle-instagram"
      >
        Toggle Instagram
      </button>
      <button
        onClick={() => focusLock.addCustomApp('Duolingo', 'custom', 'duolingo.com')}
        data-testid="btn-add-custom"
      >
        Add Custom
      </button>
      <FocusLockBanner
        isLocked={focusLock.isLocked}
        enabled={focusLock.settings.enabled}
        blockedAppCount={focusLock.selectedAppsCount}
        timerStatus={focusLock.isLocked ? 'running' : 'idle'}
        timerMode="focus"
        onOpenConfig={focusLock.openConfigModal}
        onEndSessionEarly={focusLock.openEndEarlyModal}
        platform={focusLock.platform}
      />
      <FocusLockModal
        isOpen={focusLock.isConfigModalOpen}
        onClose={focusLock.closeConfigModal}
        settings={focusLock.settings}
        onSaveSettings={focusLock.updateSettings}
        availableApps={focusLock.availableApps}
        selectedAppIds={focusLock.selectedAppIds}
        onToggleApp={focusLock.toggleApp}
        onSelectAll={focusLock.selectAllApps}
        onDeselectAll={focusLock.deselectAllApps}
        onSelectCategory={focusLock.selectCategory}
        onAddCustomApp={focusLock.addCustomApp}
        onRemoveCustomApp={focusLock.removeCustomApp}
        platform={focusLock.platform}
        isLocked={focusLock.isLocked}
      />
      <FocusLockEndEarlyModal
        isOpen={focusLock.isEndEarlyModalOpen}
        onCancel={focusLock.closeEndEarlyModal}
        onConfirm={focusLock.confirmEndEarly}
        remainingMinutes={25}
      />
    </div>
  );
}

describe('Focus Lock System & Component Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with default settings and pre-selected apps', () => {
    render(<TestFocusLockConsumer />);

    expect(screen.getByTestId('selected-count')).toHaveTextContent(
      String(DEFAULT_FOCUS_LOCK_SETTINGS.selectedAppIds.length)
    );
    expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
  });

  it('engages focus lock when session starts and displays active banner', () => {
    render(<TestFocusLockConsumer />);

    expect(screen.queryByTestId('focus-lock-active-banner')).toBeNull();
    expect(screen.getByTestId('focus-lock-pill-container')).toBeDefined();

    // Start session lock
    fireEvent.click(screen.getByTestId('btn-start-lock'));

    expect(screen.getByTestId('is-locked')).toHaveTextContent('true');
    expect(screen.getByTestId('focus-lock-active-banner')).toBeDefined();
    expect(screen.getByTestId('end-focus-session-btn')).toBeDefined();
  });

  it('allows user to manually end session early at any time', () => {
    render(<TestFocusLockConsumer />);

    fireEvent.click(screen.getByTestId('btn-start-lock'));
    expect(screen.getByTestId('is-locked')).toHaveTextContent('true');

    // Click End Session button on banner
    fireEvent.click(screen.getByTestId('end-focus-session-btn'));

    // Should immediately unlock
    expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
    expect(screen.queryByTestId('focus-lock-active-banner')).toBeNull();
  });

  it('toggles app selection and updates localStorage', () => {
    render(<TestFocusLockConsumer />);

    const initialCount = DEFAULT_FOCUS_LOCK_SETTINGS.selectedAppIds.length;
    // Instagram is selected by default; toggling should remove it
    fireEvent.click(screen.getByTestId('btn-toggle-instagram'));

    expect(screen.getByTestId('selected-count')).toHaveTextContent(String(initialCount - 1));

    const saved = JSON.parse(localStorage.getItem(FOCUS_LOCK_STORAGE_KEY) || '{}');
    expect(saved.selectedAppIds).not.toContain('instagram');
  });

  it('supports adding custom distracting apps', () => {
    render(<TestFocusLockConsumer />);

    fireEvent.click(screen.getByTestId('btn-add-custom'));

    const saved = JSON.parse(localStorage.getItem(FOCUS_LOCK_STORAGE_KEY) || '{}');
    expect(saved.customApps).toBeDefined();
    expect(saved.customApps.some((a: { name: string }) => a.name === 'Duolingo')).toBe(true);
  });

  it('opens and interacts with the FocusLockModal', () => {
    render(<TestFocusLockConsumer />);

    // Open modal via the banner pill trigger
    fireEvent.click(screen.getByTestId('open-focus-lock-config-btn'));

    expect(screen.getByTestId('focus-lock-modal')).toBeDefined();
    expect(screen.getByTestId('focus-lock-enabled-toggle')).toBeChecked();

    // Deselect all
    fireEvent.click(screen.getByTestId('deselect-all-apps-btn'));
    expect(screen.getByTestId('selected-apps-count')).toHaveTextContent(/0 of/i);

    // Close modal
    fireEvent.click(screen.getByTestId('save-focus-lock-btn'));
    expect(screen.queryByTestId('focus-lock-modal')).toBeNull();
  });
});
