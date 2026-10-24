package com.doflow.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * BroadcastReceiver for handling notification actions and session termination events.
 */
public class FocusLockActionReceiver extends BroadcastReceiver {
    public static final String ACTION_SESSION_ENDED_EARLY = "com.doflow.app.ACTION_SESSION_ENDED_EARLY";
    public static final String ACTION_END_FROM_NOTIFICATION = "com.doflow.app.ACTION_END_FROM_NOTIFICATION";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        if (ACTION_END_FROM_NOTIFICATION.equals(intent.getAction())) {
            FocusLockStorage storage = new FocusLockStorage(context);
            storage.stopSession("ended_from_notification");

            // Stop foreground notification service
            Intent serviceIntent = new Intent(context, FocusLockForegroundService.class);
            context.stopService(serviceIntent);

            // Notify Doflow app
            Intent broadcast = new Intent(ACTION_SESSION_ENDED_EARLY);
            broadcast.setPackage(context.getPackageName());
            context.sendBroadcast(broadcast);
        }
    }
}
