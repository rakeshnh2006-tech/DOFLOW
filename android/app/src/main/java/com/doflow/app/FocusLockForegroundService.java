package com.doflow.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service that keeps Focus Lock visible and resilient against OS termination.
 * Displays persistent notification with session progress and a one-tap "End Session" action.
 */
public class FocusLockForegroundService extends Service {
    public static final String CHANNEL_ID = "doflow_focus_lock_channel";
    public static final int NOTIFICATION_ID = 40401;

    private FocusLockStorage storage;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable checkDeadlineRunnable;

    @Override
    public void onCreate() {
        super.onCreate();
        storage = new FocusLockStorage(this);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (!storage.isSessionActive()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        startForeground(NOTIFICATION_ID, buildNotification());
        scheduleDeadlineCheck();

        return START_STICKY;
    }

    private void scheduleDeadlineCheck() {
        if (checkDeadlineRunnable != null) {
            handler.removeCallbacks(checkDeadlineRunnable);
        }

        checkDeadlineRunnable = new Runnable() {
            @Override
            public void run() {
                if (!storage.isSessionActive()) {
                    stopSelf();
                    return;
                }

                // Update notification text with remaining minutes
                long remainingMs = storage.getRemainingMs();
                if (remainingMs <= 0) {
                    storage.stopSession();
                    stopSelf();
                } else {
                    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                    if (manager != null) {
                        manager.notify(NOTIFICATION_ID, buildNotification());
                    }
                    handler.postDelayed(this, 30000); // Update every 30 seconds
                }
            }
        };
        handler.postDelayed(checkDeadlineRunnable, 30000);
    }

    private Notification buildNotification() {
        int blockedCount = storage.getActiveBlockedPackages().size();
        long remainingMinutes = Math.max(1, (storage.getRemainingMs() + 59999) / 60000);
        String title = storage.getSessionTitle();

        // Intent to return to Doflow
        Intent openAppIntent = new Intent(this, MainActivity.class);
        openAppIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent pendingOpen = PendingIntent.getActivity(
                this,
                0,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        // Action intent to end session early
        Intent endIntent = new Intent(this, FocusLockActionReceiver.class);
        endIntent.setAction(FocusLockActionReceiver.ACTION_END_FROM_NOTIFICATION);
        PendingIntent pendingEnd = PendingIntent.getBroadcast(
                this,
                1,
                endIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("🔒 Focus Lock Active • " + title)
                .setContentText(blockedCount + " distracting apps blocked (" + remainingMinutes + " min remaining)")
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setContentIntent(pendingOpen)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "End Session", pendingEnd)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    getString(R.string.focus_notification_channel_name),
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription(getString(R.string.focus_notification_channel_desc));
            channel.setShowBadge(false);

            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (checkDeadlineRunnable != null) {
            handler.removeCallbacks(checkDeadlineRunnable);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
