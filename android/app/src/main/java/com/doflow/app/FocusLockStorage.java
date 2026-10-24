package com.doflow.app;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Thread-safe persistent storage for Doflow Focus Lock state.
 * Accessible across the UI process, background AccessibilityService,
 * ForegroundService, and BootReceiver.
 */
public class FocusLockStorage {
    private static final String PREF_NAME = "doflow_focus_lock_state";

    private static final String KEY_IS_SESSION_ACTIVE = "is_session_active";
    private static final String KEY_SESSION_ID = "session_id";
    private static final String KEY_SESSION_START_TIME = "session_start_time";
    private static final String KEY_SESSION_END_TIME = "session_end_time";
    private static final String KEY_SESSION_TITLE = "session_title";
    private static final String KEY_ACTIVE_BLOCKED_PACKAGES = "active_blocked_packages";
    private static final String KEY_SAVED_SELECTED_PACKAGES = "saved_selected_packages";
    private static final String KEY_CONFIRM_EARLY_EXIT = "confirm_early_exit";
    private static final String KEY_END_REASON = "end_reason";

    private final SharedPreferences prefs;

    public FocusLockStorage(Context context) {
        this.prefs = context.getApplicationContext().getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public synchronized void startSession(String sessionId, long durationMs, String title, Set<String> blockedPackages) {
        long now = System.currentTimeMillis();
        long endTime = now + Math.max(0, durationMs);
        String finalId = (sessionId != null && !sessionId.isEmpty())
                ? sessionId
                : "android_" + now;

        prefs.edit()
                .putBoolean(KEY_IS_SESSION_ACTIVE, true)
                .putString(KEY_SESSION_ID, finalId)
                .putLong(KEY_SESSION_START_TIME, now)
                .putLong(KEY_SESSION_END_TIME, endTime)
                .putString(KEY_SESSION_TITLE, title != null ? title : "Focus Session")
                .putStringSet(KEY_ACTIVE_BLOCKED_PACKAGES, new HashSet<>(blockedPackages))
                .remove(KEY_END_REASON)
                .apply();
    }

    public synchronized void startSession(long durationMs, String title, Set<String> blockedPackages) {
        startSession(null, durationMs, title, blockedPackages);
    }

    public synchronized void stopSession(String reason) {
        prefs.edit()
                .putBoolean(KEY_IS_SESSION_ACTIVE, false)
                .putLong(KEY_SESSION_START_TIME, 0)
                .putLong(KEY_SESSION_END_TIME, 0)
                .putStringSet(KEY_ACTIVE_BLOCKED_PACKAGES, Collections.emptySet())
                .putString(KEY_END_REASON, reason != null ? reason : "user_manual_unlock")
                .apply();
    }

    public synchronized void stopSession() {
        stopSession("user_manual_unlock");
    }

    public synchronized boolean isSessionActive() {
        boolean active = prefs.getBoolean(KEY_IS_SESSION_ACTIVE, false);
        if (!active) {
            return false;
        }

        // Validate that deadline has not passed
        long endTime = prefs.getLong(KEY_SESSION_END_TIME, 0);
        if (endTime > 0 && System.currentTimeMillis() >= endTime) {
            stopSession("timer_completed");
            return false;
        }

        return true;
    }

    public synchronized long getRemainingMs() {
        if (!isSessionActive()) {
            return 0;
        }
        long endTime = prefs.getLong(KEY_SESSION_END_TIME, 0);
        return Math.max(0, endTime - System.currentTimeMillis());
    }

    public synchronized String getSessionId() {
        return prefs.getString(KEY_SESSION_ID, "");
    }

    public synchronized String getSessionTitle() {
        return prefs.getString(KEY_SESSION_TITLE, "Deep Work Session");
    }

    public synchronized String getEndReason() {
        return prefs.getString(KEY_END_REASON, "");
    }

    public synchronized Set<String> getActiveBlockedPackages() {
        if (!isSessionActive()) {
            return Collections.emptySet();
        }
        Set<String> set = prefs.getStringSet(KEY_ACTIVE_BLOCKED_PACKAGES, null);
        return set != null ? new HashSet<>(set) : Collections.emptySet();
    }

    public synchronized void saveSelectedPackages(Set<String> packages) {
        prefs.edit()
                .putStringSet(KEY_SAVED_SELECTED_PACKAGES, new HashSet<>(packages))
                .apply();
    }

    public synchronized Set<String> getSavedSelectedPackages() {
        Set<String> set = prefs.getStringSet(KEY_SAVED_SELECTED_PACKAGES, null);
        return set != null ? new HashSet<>(set) : Collections.emptySet();
    }

    public synchronized void setConfirmEarlyExit(boolean confirm) {
        prefs.edit().putBoolean(KEY_CONFIRM_EARLY_EXIT, confirm).apply();
    }

    public synchronized boolean isConfirmEarlyExit() {
        return prefs.getBoolean(KEY_CONFIRM_EARLY_EXIT, false);
    }
}
