package com.doflow.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

/**
 * Full-screen Focus Shield displayed when a user attempts to launch
 * a restricted application during an active Doflow Pomodoro countdown.
 *
 * Guarantees:
 * - Clear reminder of the active deep work session.
 * - Always allows the user to return to Doflow.
 * - Allows the user to manually end their focus session early at any time.
 * - Going back redirects to Home rather than back into the restricted app.
 */
public class FocusShieldActivity extends Activity {

    private FocusLockStorage storage;
    private TextView tvCountdown;
    private final Handler timerHandler = new Handler(Looper.getMainLooper());
    private Runnable countdownRunnable;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_focus_shield);

        storage = new FocusLockStorage(this);

        TextView tvTask = findViewById(R.id.tv_shield_task);
        tvCountdown = findViewById(R.id.tv_shield_countdown);
        Button btnReturn = findViewById(R.id.btn_return_doflow);
        Button btnEndEarly = findViewById(R.id.btn_end_early);

        String title = storage.getSessionTitle();
        tvTask.setText(title != null && !title.isEmpty() ? title : "Deep Work Session in Progress");

        btnReturn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                returnToDoflow();
            }
        });

        btnEndEarly.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                endSessionEarly();
            }
        });

        setupCountdown();
    }

    private void setupCountdown() {
        countdownRunnable = new Runnable() {
            @Override
            public void run() {
                if (!storage.isSessionActive()) {
                    finish();
                    return;
                }

                long remainingMs = storage.getRemainingMs();
                long totalSeconds = Math.max(0, remainingMs / 1000);
                long minutes = totalSeconds / 60;
                long seconds = totalSeconds % 60;
                tvCountdown.setText(String.format("%02d:%02d remaining", minutes, seconds));

                if (remainingMs > 0) {
                    timerHandler.postDelayed(this, 1000);
                } else {
                    storage.stopSession();
                    finish();
                }
            }
        };
        timerHandler.post(countdownRunnable);
    }

    private void returnToDoflow() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        startActivity(intent);
        finish();
    }

    private void endSessionEarly() {
        // 1. Terminate lock state in storage
        storage.stopSession("ended_from_shield");

        // 2. Stop foreground service
        Intent serviceIntent = new Intent(this, FocusLockForegroundService.class);
        stopService(serviceIntent);

        // 3. Send broadcast so WebView/MainActivity syncs state
        Intent broadcast = new Intent(FocusLockActionReceiver.ACTION_SESSION_ENDED_EARLY);
        broadcast.setPackage(getPackageName());
        sendBroadcast(broadcast);

        // 4. Return to Doflow
        returnToDoflow();
    }

    @Override
    public void onBackPressed() {
        // Redirect to device Home launcher rather than falling back into the blocked app
        Intent homeIntent = new Intent(Intent.ACTION_MAIN);
        homeIntent.addCategory(Intent.CATEGORY_HOME);
        homeIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        startActivity(homeIntent);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (countdownRunnable != null) {
            timerHandler.removeCallbacks(countdownRunnable);
        }
    }
}
