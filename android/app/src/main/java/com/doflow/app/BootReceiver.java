package com.doflow.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/**
 * Handles device restarts to ensure focus session recovery or cleanup.
 *
 * Guarantees:
 * - If device reboots mid-session, the session and blocked list are restored.
 * - If the timer deadline expired while powered down, restrictions are cleanly cleared.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            return;
        }

        FocusLockStorage storage = new FocusLockStorage(context);

        if (storage.isSessionActive()) {
            // Restore ongoing session foreground notification
            Intent serviceIntent = new Intent(context, FocusLockForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        } else {
            // Cleanup any stale records
            storage.stopSession();
        }
    }
}
