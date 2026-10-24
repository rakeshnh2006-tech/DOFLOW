import { Capacitor, registerPlugin } from '@capacitor/core';
import type { DistractingApp } from '../../types/focusLock';

export interface AndroidPermissionStatus {
  hasAccessibility: boolean;
  hasNotification: boolean;
  isIgnoringBatteryOptimizations: boolean;
  allPermissionsGranted: boolean;
}

export interface AndroidInstalledApp {
  id: string;
  name: string;
  packageName: string;
  category: 'social' | 'entertainment' | 'gaming' | 'custom';
}

export interface ActivationResult {
  success: boolean;
  isLocked: boolean;
  blockedCount: number;
  sessionId?: string;
  error?: string;
}

export interface DeactivationResult {
  success: boolean;
  isLocked: boolean;
  error?: string;
}

export interface NativeLockStatus {
  isLocked: boolean;
  remainingMs: number;
  blockedCount: number;
  sessionTitle: string;
  sessionId?: string;
  endReason?: string;
}

export interface NativeFocusLockPlugin {
  isAvailable(): Promise<{ available: boolean; platform: string }>;
  getPermissionStatus(): Promise<AndroidPermissionStatus>;
  requestAccessibilityPermission(): Promise<{ opened: boolean }>;
  requestBatteryExemption(): Promise<{ opened: boolean }>;
  getInstalledApps(): Promise<{ apps: AndroidInstalledApp[]; totalCount: number }>;
  startFocusLock(options: {
    durationMs: number;
    sessionTitle?: string;
    sessionId?: string;
    blockedPackages: string[];
  }): Promise<{ success: boolean; isLocked: boolean; blockedCount: number; sessionId?: string; error?: string }>;
  stopFocusLock(options?: {
    reason?: string;
  }): Promise<{ success: boolean; isLocked: boolean; error?: string }>;
  getLockStatus(): Promise<NativeLockStatus>;
}

// Register native plugin proxy with Capacitor
export const NativeDoflowFocusLock = registerPlugin<NativeFocusLockPlugin>('DoflowFocusLock');

export class FocusLockBridge {
  public static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public static isAndroidNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  public static isIosNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
  }

  public static getPlatform(): 'web' | 'android' | 'ios' {
    if (!Capacitor.isNativePlatform()) return 'web';
    const p = Capacitor.getPlatform();
    if (p === 'android') return 'android';
    if (p === 'ios') return 'ios';
    return 'web';
  }

  public static async getPermissionStatus(): Promise<AndroidPermissionStatus | null> {
    if (!this.isNative()) return null;
    try {
      return await NativeDoflowFocusLock.getPermissionStatus();
    } catch (e) {
      console.warn('Failed to get native permission status:', e);
      return null;
    }
  }

  public static async requestAccessibility(): Promise<boolean> {
    if (!this.isNative()) return false;
    try {
      const res = await NativeDoflowFocusLock.requestAccessibilityPermission();
      return Boolean(res.opened);
    } catch (e) {
      console.error('Failed to request accessibility settings:', e);
      return false;
    }
  }

  public static async requestBatteryExemption(): Promise<boolean> {
    if (!this.isAndroidNative()) return false;
    try {
      const res = await NativeDoflowFocusLock.requestBatteryExemption();
      return Boolean(res.opened);
    } catch (e) {
      console.error('Failed to request battery exemption:', e);
      return false;
    }
  }

  public static async fetchInstalledApps(): Promise<DistractingApp[]> {
    if (!this.isNative()) return [];
    try {
      const result = await NativeDoflowFocusLock.getInstalledApps();
      if (!result || !Array.isArray(result.apps)) return [];

      return result.apps.map((app) => ({
        id: app.packageName || app.id,
        name: app.name,
        category: app.category,
        packageNameAndroid: app.packageName,
        bundleIdIos: app.packageName,
      }));
    } catch (e) {
      console.warn('Could not fetch installed native apps:', e);
      return [];
    }
  }

  // Backward compatibility alias
  public static async fetchInstalledAndroidApps(): Promise<DistractingApp[]> {
    return this.fetchInstalledApps();
  }

  public static async startNativeLock(
    durationMs: number,
    sessionTitle: string,
    blockedPackages: string[],
    sessionId?: string
  ): Promise<ActivationResult> {
    if (!this.isNative()) {
      return { success: true, isLocked: true, blockedCount: blockedPackages.length };
    }
    try {
      const res = await NativeDoflowFocusLock.startFocusLock({
        durationMs,
        sessionTitle,
        sessionId,
        blockedPackages,
      });
      return {
        success: Boolean(res.success),
        isLocked: Boolean(res.isLocked),
        blockedCount: res.blockedCount ?? blockedPackages.length,
        sessionId: res.sessionId || sessionId,
        error: res.error,
      };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error('Failed to engage native lock:', errorMsg);
      return {
        success: false,
        isLocked: false,
        blockedCount: 0,
        error: errorMsg,
      };
    }
  }

  public static async stopNativeLock(reason: string = 'user_manual_unlock'): Promise<DeactivationResult> {
    if (!this.isNative()) {
      return { success: true, isLocked: false };
    }
    try {
      const res = await NativeDoflowFocusLock.stopFocusLock({ reason });
      return {
        success: Boolean(res.success),
        isLocked: Boolean(res.isLocked),
        error: res.error,
      };
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error('Failed to disengage native lock:', errorMsg);
      return {
        success: false,
        isLocked: true, // conservative fallback: assume still locked if call failed
        error: errorMsg,
      };
    }
  }

  public static async getLockStatus(): Promise<NativeLockStatus | null> {
    if (!this.isNative()) return null;
    try {
      return await NativeDoflowFocusLock.getLockStatus();
    } catch (e) {
      console.warn('Failed to query native lock status:', e);
      return null;
    }
  }
}
