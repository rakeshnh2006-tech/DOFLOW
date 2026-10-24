import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import type { AuthUser } from '../types/auth';
import { useFocusLock } from '../hooks/useFocusLock';
import { FocusLockBridge } from '../services/focusLock/FocusLockBridge';
import { clearAllDoflowData } from '../utils/dataManagement';
import { DEFAULT_FOCUS_DURATION_MS } from '../types/focusLock';

const mockUser: AuthUser = {
  id: 'vertical_slice_tester',
  name: 'Slice Tester',
  email: 'slice@doflow.app',
  provider: 'google',
  lastLoginAt: Date.now(),
  syncedAt: Date.now(),
  accountCreatedAt: Date.now(),
};

const VerticalSliceHarness: React.FC<{
  onManualEndSession?: () => void;
  onSessionComplete?: () => void;
}> = ({ onManualEndSession, onSessionComplete }) => {
  const focusLock = useFocusLock({
    user: mockUser,
    onManualEndSession,
    onSessionComplete,
  });

  return (
    <div>
      <div data-testid="platform">{focusLock.platform}</div>
      <div data-testid="is-locked">{String(focusLock.isLocked)}</div>
      <div data-testid="status">{focusLock.status}</div>
      <div data-testid="remaining-ms">{focusLock.remainingMs}</div>
      <div data-testid="target-duration">{focusLock.targetDurationMs}</div>
      <div data-testid="selected-count">{focusLock.selectedAppsCount}</div>
      <div data-testid="unlock-error">{focusLock.unlockError || 'none'}</div>

      {/* Select an App */}
      <button
        data-testid="btn-select-instagram"
        onClick={() => focusLock.toggleApp('instagram')}
      >
        Select Instagram
      </button>

      {/* iOS Family Picker Trigger */}
      <button
        data-testid="btn-ios-picker"
        onClick={() => focusLock.selectIosAppsWithFamilyPicker()}
      >
        Open iOS Screen Time Picker
      </button>

      {/* Start 25-minute Focus Session */}
      <button
        data-testid="btn-start-session-default"
        onClick={() => focusLock.startSessionLock()}
      >
        Start 25m Focus Session
      </button>

      {/* Early Termination */}
      <button
        data-testid="btn-end-early"
        onClick={() => focusLock.endSessionLock('user_manual_unlock')}
      >
        End Session Early
      </button>

      {/* Natural Timer Expiration */}
      <button
        data-testid="btn-complete-session"
        onClick={() => focusLock.completeSessionLock()}
      >
        Natural Expiration
      </button>
    </div>
  );
};

describe('Doflow Focus Lock — Smallest Working Vertical Slice', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAllDoflowData();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Android Vertical Slice', () => {
    it('selects an app, starts 25-min session, restricts app, ends early, removes restriction', async () => {
      // 1. Simulate native Android environment with Accessibility granted
      vi.spyOn(FocusLockBridge, 'getPlatform').mockReturnValue('android');
      vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(true);
      vi.spyOn(FocusLockBridge, 'isAndroidNative').mockReturnValue(true);
      vi.spyOn(FocusLockBridge, 'getPermissionStatus').mockResolvedValue({
        hasAccessibility: true,
        hasNotification: true,
        isIgnoringBatteryOptimizations: true,
        allPermissionsGranted: true,
      });

      const startSpy = vi.spyOn(FocusLockBridge, 'startNativeLock').mockResolvedValue({
        success: true,
        isLocked: true,
        blockedCount: 1,
        sessionId: 'android_slice_1',
      });

      const stopSpy = vi.spyOn(FocusLockBridge, 'stopNativeLock').mockResolvedValue({
        success: true,
        isLocked: false,
      });

      const onManualEndSpy = vi.fn();
      render(<VerticalSliceHarness onManualEndSession={onManualEndSpy} />);

      expect(screen.getByTestId('platform')).toHaveTextContent('android');
      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('idle');

      // 2. Select app
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-select-instagram'));
      });
      expect(screen.getByTestId('selected-count')).not.toHaveTextContent('0');

      // 3. Start focus session (defaults to 25 minutes)
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-start-session-default'));
      });

      // Verify native restriction is applied with 25-minute duration (1,500,000 ms)
      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(startSpy).toHaveBeenCalledWith(
        DEFAULT_FOCUS_DURATION_MS,
        'Deep Work Session',
        expect.any(Array),
        expect.any(String)
      );

      // Verify session is active and locked
      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');
      expect(screen.getByTestId('status')).toHaveTextContent('active');
      expect(screen.getByTestId('target-duration')).toHaveTextContent('1500000');

      // 4. Manually end session early before timer expires
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-end-early'));
      });

      // Verify native unblocking was triggered immediately
      expect(stopSpy).toHaveBeenCalledTimes(1);
      expect(stopSpy).toHaveBeenCalledWith('user_manual_unlock');

      // Verify restrictions are completely removed
      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('ended_early');
      expect(onManualEndSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('iOS Vertical Slice', () => {
    it('selects apps via FamilyControls picker, starts 25-min session, restricts app, ends early, removes restriction', async () => {
      // 1. Simulate native iOS environment with FamilyControls approved
      vi.spyOn(FocusLockBridge, 'getPlatform').mockReturnValue('ios');
      vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(true);
      vi.spyOn(FocusLockBridge, 'isIosNative').mockReturnValue(true);
      vi.spyOn(FocusLockBridge, 'getPermissionStatus').mockResolvedValue({
        hasAccessibility: true, // represents FamilyControls approved
        hasNotification: true,
        isIgnoringBatteryOptimizations: true,
        allPermissionsGranted: true,
      });

      const pickerSpy = vi.spyOn(FocusLockBridge, 'presentIosAppPicker').mockResolvedValue({
        success: true,
        applicationCount: 3,
        categoryCount: 1,
        totalSelected: 4,
      });

      const startSpy = vi.spyOn(FocusLockBridge, 'startNativeLock').mockResolvedValue({
        success: true,
        isLocked: true,
        blockedCount: 3,
        sessionId: 'ios_slice_1',
      });

      const stopSpy = vi.spyOn(FocusLockBridge, 'stopNativeLock').mockResolvedValue({
        success: true,
        isLocked: false,
      });

      const onManualEndSpy = vi.fn();
      render(<VerticalSliceHarness onManualEndSession={onManualEndSpy} />);

      expect(screen.getByTestId('platform')).toHaveTextContent('ios');

      // 2. Select apps using Apple's FamilyControls system picker
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-ios-picker'));
      });
      expect(pickerSpy).toHaveBeenCalledTimes(1);

      // 3. Start 25-minute focus session
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-start-session-default'));
      });

      expect(startSpy).toHaveBeenCalledTimes(1);
      expect(startSpy).toHaveBeenCalledWith(
        DEFAULT_FOCUS_DURATION_MS,
        'Deep Work Session',
        expect.any(Array),
        expect.any(String)
      );
      expect(screen.getByTestId('is-locked')).toHaveTextContent('true');
      expect(screen.getByTestId('status')).toHaveTextContent('active');

      // 4. Manually end session early
      await act(async () => {
        fireEvent.click(screen.getByTestId('btn-end-early'));
      });

      expect(stopSpy).toHaveBeenCalledTimes(1);
      expect(stopSpy).toHaveBeenCalledWith('user_manual_unlock');
      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
      expect(screen.getByTestId('status')).toHaveTextContent('ended_early');
      expect(onManualEndSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Web Sandbox Behavior', () => {
    it('truthfully reports web platform without mock domain blocking', async () => {
      vi.spyOn(FocusLockBridge, 'getPlatform').mockReturnValue('web');
      vi.spyOn(FocusLockBridge, 'isNative').mockReturnValue(false);

      render(<VerticalSliceHarness />);

      expect(screen.getByTestId('platform')).toHaveTextContent('web');
      expect(screen.getByTestId('is-locked')).toHaveTextContent('false');
    });
  });
});
