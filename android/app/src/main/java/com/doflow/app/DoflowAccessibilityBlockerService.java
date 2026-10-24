package com.doflow.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.view.accessibility.AccessibilityEvent;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Android Accessibility Service for real-time application restriction.
 *
 * Operational Principles & Safeguards:
 * 1. Event-Driven: Triggered strictly by window state change events (zero background CPU polling).
 * 2. Privacy First: Declares canRetrieveWindowContent="false". Never inspects or processes
 *    screen content, typed characters, or passwords.
 * 3. Safety Whitelist: Never blocks emergency dialers, phone calls, system settings, or home launchers.
 * 4. User Sovereignty: Users can end sessions anytime from the shield activity, notification, or Doflow.
 */
public class DoflowAccessibilityBlockerService extends AccessibilityService {

    private FocusLockStorage storage;
    private String lastBlockedPackage = null;
    private long lastBlockTimestamp = 0;

    /**
     * Absolute safety whitelist: packages that Doflow will NEVER block under any circumstance.
     */
    private static final Set<String> ESSENTIAL_WHITELIST = new HashSet<>(Arrays.asList(
            // Emergency Calling & Phone
            "com.android.phone",
            "com.google.android.dialer",
            "com.samsung.android.dialer",
            "com.android.server.telecom",
            "com.android.emergency",
            "com.google.android.apps.safetyhub",

            // System UI & Home Launchers
            "com.android.systemui",
            "com.google.android.apps.nexuslauncher",
            "com.sec.android.app.launcher",
            "com.miui.home",
            "com.huawei.android.launcher",

            // Settings (Preserves ability to revoke permissions)
            "com.android.settings",
            "com.google.android.packageinstaller",
            "com.android.packageinstaller",

            // Doflow
            "com.doflow.app"
    ));

    @Override
    public void onCreate() {
        super.onCreate();
        storage = new FocusLockStorage(this);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            return;
        }

        CharSequence pkgNameChar = event.getPackageName();
        if (pkgNameChar == null) {
            return;
        }

        String packageName = pkgNameChar.toString();

        // 1. Safety whitelist check
        if (ESSENTIAL_WHITELIST.contains(packageName)) {
            return;
        }

        // 2. Focus lock session active check
        if (!storage.isSessionActive()) {
            return;
        }

        // 3. Blocked packages check
        Set<String> blockedPackages = storage.getActiveBlockedPackages();
        if (blockedPackages == null || !blockedPackages.contains(packageName)) {
            return;
        }

        // 4. Debounce repeated events within 1.5 seconds for the same package
        long now = System.currentTimeMillis();
        if (packageName.equals(lastBlockedPackage) && (now - lastBlockTimestamp < 1500)) {
            return;
        }

        lastBlockedPackage = packageName;
        lastBlockTimestamp = now;

        // 5. Intercept: dismiss blocked app to home & launch Doflow Focus Shield
        performGlobalAction(GLOBAL_ACTION_HOME);

        Intent shieldIntent = new Intent(this, FocusShieldActivity.class);
        shieldIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS);
        startActivity(shieldIntent);
    }

    @Override
    public void onInterrupt() {
        // Called when the system wants to interrupt feedback
    }
}
