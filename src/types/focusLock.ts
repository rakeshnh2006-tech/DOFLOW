/**
 * Types and data models for Doflow Focus Lock.
 * Supports cross-platform focus locking (Web graceful mode, Android native blocking, iOS Screen Time).
 */

export type AppCategory = 'social' | 'entertainment' | 'messaging' | 'gaming' | 'custom';

export interface DistractingApp {
  id: string;
  name: string;
  category: AppCategory;
  packageNameAndroid?: string;
  bundleIdIos?: string;
  webDomain?: string;
  iconName?: string;
  isCustom?: boolean;
}

export interface FocusLockSettings {
  /**
   * User identifier associated with these settings (or 'guest').
   */
  userId?: string;
  /**
   * Monotonic version for multi-device conflict resolution.
   */
  version?: number;
  /**
   * Timestamp of last update.
   */
  updatedAt?: number;
  /**
   * Whether Focus Lock engages automatically when a Pomodoro focus countdown begins.
   */
  enabled: boolean;
  /**
   * Whether the user can manually unlock and end the session early.
   * Doflow guarantees user sovereignty: defaults to true.
   */
  allowEarlyExit: boolean;
  /**
   * List of selected distracting app IDs to block.
   */
  selectedAppIds: string[];
  /**
   * Custom user-added distracting apps/domains.
   */
  customApps: DistractingApp[];
  /**
   * Web focus protection behavior when running inside a browser sandbox.
   */
  webFocusMode: 'shield' | 'gentle';
  /**
   * Strict mode: requires confirmation modal when ending early to prevent reflexive quitting.
   */
  confirmEarlyExit: boolean;
}

export type FocusLockStatus =
  | 'idle'
  | 'starting'
  | 'active'
  | 'paused'
  | 'ending'
  | 'ended_early'
  | 'completed'
  | 'failed_unlock';

export type FocusSessionOutcome = 'completed' | 'ended_early' | 'cancelled' | 'failed_unlock';

export type FocusLockSyncStatus = 'idle' | 'syncing' | 'offline' | 'synced' | 'error';

export interface FocusLockSessionRecord {
  id: string;
  /**
   * User identifier owning this session (or 'guest').
   */
  userId?: string;
  startedAt: number;
  scheduledEndTime: number;
  endedAt: number;
  targetDurationMs: number;
  actualDurationMs: number;
  status?: FocusLockStatus;
  outcome: FocusSessionOutcome;
  blockedAppCount: number;
  blockedAppIds: string[];
  sessionTitle: string;
  platform: 'web' | 'android' | 'ios';
  earlyEndReason?: string;
  unlockError?: string;
  deviceId?: string;
  version?: number;
  updatedAt?: number;
  syncStatus?: 'synced' | 'pending_sync' | 'sync_error';
}

export interface ActiveFocusLockSession {
  sessionId: string;
  /**
   * User identifier owning this session (or 'guest').
   */
  userId?: string;
  startedAt: number;
  scheduledEndTime: number;
  targetDurationMs: number;
  sessionTitle: string;
  blockedAppIds: string[];
  platform: 'web' | 'android' | 'ios';
  pausedAt?: number | null;
  totalPausedMs: number;
  status?: FocusLockStatus;
  deviceId?: string;
  version?: number;
  updatedAt?: number;
}

export type FocusLockSyncOperationType =
  | 'update_settings'
  | 'start_session'
  | 'pause_session'
  | 'resume_session'
  | 'end_session_early'
  | 'complete_session';

export interface FocusLockSyncQueueItem {
  id: string;
  userId: string;
  deviceId: string;
  operation: FocusLockSyncOperationType;
  payload: Record<string, unknown>;
  queuedAt: number;
  retryCount: number;
}

export interface FocusLockSyncResult {
  success: boolean;
  syncedAt: number;
  settingsUpdated: boolean;
  historyAddedCount: number;
  activeSessionReconciled: boolean;
  error?: string;
}

export interface FocusLockSessionState {
  status: FocusLockStatus;
  isActive: boolean;
  isLocked: boolean;
  sessionId: string | null;
  startedAt: number | null;
  scheduledEndTime: number | null;
  targetDurationMs: number;
  remainingMs: number;
  formattedRemaining: { minutes: string; seconds: string; display: string };
  sessionTitle: string;
  blockedAppCount: number;
  platform: 'web' | 'android' | 'ios';
  unlockError: string | null;
  syncStatus?: FocusLockSyncStatus;
}

export const PRESET_DISTRACTING_APPS: DistractingApp[] = [
  // Social Media
  {
    id: 'instagram',
    name: 'Instagram',
    category: 'social',
    packageNameAndroid: 'com.instagram.android',
    bundleIdIos: 'com.burbn.instagram',
    webDomain: 'instagram.com',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    category: 'social',
    packageNameAndroid: 'com.zhiliaoapp.musically',
    bundleIdIos: 'com.zhiliaoapp.musically',
    webDomain: 'tiktok.com',
  },
  {
    id: 'x_twitter',
    name: 'X (Twitter)',
    category: 'social',
    packageNameAndroid: 'com.twitter.android',
    bundleIdIos: 'com.atebits.Tweetie2',
    webDomain: 'twitter.com',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    category: 'social',
    packageNameAndroid: 'com.facebook.katana',
    bundleIdIos: 'com.facebook.Facebook',
    webDomain: 'facebook.com',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    category: 'social',
    packageNameAndroid: 'com.reddit.frontpage',
    bundleIdIos: 'com.reddit.Reddit',
    webDomain: 'reddit.com',
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    category: 'social',
    packageNameAndroid: 'com.snapchat.android',
    bundleIdIos: 'com.toyopagroup.picaboo',
    webDomain: 'snapchat.com',
  },

  // Entertainment / Streaming
  {
    id: 'youtube',
    name: 'YouTube',
    category: 'entertainment',
    packageNameAndroid: 'com.google.android.youtube',
    bundleIdIos: 'com.google.ios.youtube',
    webDomain: 'youtube.com',
  },
  {
    id: 'netflix',
    name: 'Netflix',
    category: 'entertainment',
    packageNameAndroid: 'com.netflix.mediaclient',
    bundleIdIos: 'com.netflix.Netflix',
    webDomain: 'netflix.com',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    category: 'entertainment',
    packageNameAndroid: 'tv.twitch.android.app',
    bundleIdIos: 'tv.twitch',
    webDomain: 'twitch.tv',
  },

  // Messaging & Chat
  {
    id: 'discord',
    name: 'Discord',
    category: 'messaging',
    packageNameAndroid: 'com.discord',
    bundleIdIos: 'com.hammerandchisel.discord',
    webDomain: 'discord.com',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    category: 'messaging',
    packageNameAndroid: 'com.whatsapp',
    bundleIdIos: 'net.whatsapp.WhatsApp',
    webDomain: 'web.whatsapp.com',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    category: 'messaging',
    packageNameAndroid: 'org.telegram.messenger',
    bundleIdIos: 'ph.telegra.Telegraph',
    webDomain: 'web.telegram.org',
  },

  // Mobile Games
  {
    id: 'games_general',
    name: 'Mobile Games',
    category: 'gaming',
    packageNameAndroid: 'com.supercell.clashroyale',
    bundleIdIos: 'com.supercell.clashroyale',
  },
];

export const DEFAULT_FOCUS_LOCK_SETTINGS: FocusLockSettings = {
  enabled: true,
  allowEarlyExit: true,
  selectedAppIds: ['instagram', 'tiktok', 'x_twitter', 'youtube', 'reddit'],
  customApps: [],
  webFocusMode: 'shield',
  confirmEarlyExit: false,
};
