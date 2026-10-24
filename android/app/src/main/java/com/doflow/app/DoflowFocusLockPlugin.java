package com.doflow.app;

import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Base64;
import android.view.accessibility.AccessibilityManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "DoflowFocusLock")
public class DoflowFocusLockPlugin extends Plugin {

    private FocusLockStorage storage;

    @Override
    public void load() {
        super.load();
        storage = new FocusLockStorage(getContext());
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", true);
        ret.put("platform", "android");
        call.resolve(ret);
    }

    @PluginMethod
    public void getPermissionStatus(PluginCall call) {
        Context context = getContext();

        boolean hasAccessibility = isAccessibilityEnabled(context);
        boolean hasNotification = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasNotification = context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }

        boolean isIgnoringBattery = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                isIgnoringBattery = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }
        } else {
            isIgnoringBattery = true;
        }

        JSObject ret = new JSObject();
        ret.put("hasAccessibility", hasAccessibility);
        ret.put("hasNotification", hasNotification);
        ret.put("isIgnoringBatteryOptimizations", isIgnoringBattery);
        ret.put("allPermissionsGranted", hasAccessibility && hasNotification);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAccessibilityPermission(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open accessibility settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestBatteryExemption(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to request battery exemption: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        Context context = getContext();
        PackageManager pm = context.getPackageManager();

        Intent launcherIntent = new Intent(Intent.ACTION_MAIN, null);
        launcherIntent.addCategory(Intent.CATEGORY_LAUNCHER);

        List<ResolveInfo> activities = pm.queryIntentActivities(launcherIntent, 0);
        JSArray appsArray = new JSArray();

        String myPackage = context.getPackageName();

        for (ResolveInfo ri : activities) {
            if (ri.activityInfo == null) continue;
            String packageName = ri.activityInfo.packageName;

            // Skip self and essential system packages
            if (packageName.equals(myPackage) ||
                packageName.startsWith("com.android.phone") ||
                packageName.startsWith("com.android.settings") ||
                packageName.startsWith("com.android.systemui")) {
                continue;
            }

            CharSequence labelChar = ri.loadLabel(pm);
            String label = labelChar != null ? labelChar.toString() : packageName;

            JSObject appObj = new JSObject();
            appObj.put("id", packageName);
            appObj.put("name", label);
            appObj.put("packageName", packageName);

            // Infer category or assign general
            ApplicationInfo appInfo = ri.activityInfo.applicationInfo;
            String category = "social";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && appInfo != null) {
                switch (appInfo.category) {
                    case ApplicationInfo.CATEGORY_GAME:
                        category = "gaming";
                        break;
                    case ApplicationInfo.CATEGORY_AUDIO:
                    case ApplicationInfo.CATEGORY_VIDEO:
                    case ApplicationInfo.CATEGORY_IMAGE:
                        category = "entertainment";
                        break;
                    case ApplicationInfo.CATEGORY_SOCIAL:
                        category = "social";
                        break;
                    default:
                        category = "custom";
                }
            }
            appObj.put("category", category);

            appsArray.put(appObj);
        }

        JSObject result = new JSObject();
        result.put("apps", appsArray);
        result.put("totalCount", appsArray.length());
        call.resolve(result);
    }

    @PluginMethod
    public void startFocusLock(PluginCall call) {
        Context context = getContext();
        if (!isAccessibilityEnabled(context)) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("isLocked", false);
            ret.put("error", "Accessibility Service must be enabled in device settings before starting Focus Lock.");
            call.resolve(ret);
            return;
        }

        Long durationMs = call.getLong("durationMs", 25L * 60 * 1000);
        String sessionTitle = call.getString("sessionTitle", "Focus Session");
        String sessionId = call.getString("sessionId", "android_" + System.currentTimeMillis());
        JSArray packagesArray = call.getArray("blockedPackages");

        Set<String> packageSet = new HashSet<>();
        if (packagesArray != null) {
            try {
                for (int i = 0; i < packagesArray.length(); i++) {
                    packageSet.add(packagesArray.getString(i));
                }
            } catch (Exception ignored) {}
        }

        try {
            // Save session state
            storage.startSession(sessionId, durationMs, sessionTitle, packageSet);

            // Start Foreground Service
            Context context = getContext();
            Intent serviceIntent = new Intent(context, FocusLockForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("isLocked", true);
            ret.put("blockedCount", packageSet.size());
            ret.put("sessionId", sessionId);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("isLocked", false);
            ret.put("error", e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void stopFocusLock(PluginCall call) {
        String reason = call.getString("reason", "user_manual_unlock");
        try {
            storage.stopSession(reason);

            Context context = getContext();
            Intent serviceIntent = new Intent(context, FocusLockForegroundService.class);
            context.stopService(serviceIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("isLocked", false);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("isLocked", storage.isSessionActive());
            ret.put("error", "Failed to stop lock: " + e.getMessage());
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void getLockStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isLocked", storage.isSessionActive());
        ret.put("remainingMs", storage.getRemainingMs());
        ret.put("blockedCount", storage.getActiveBlockedPackages().size());
        ret.put("sessionTitle", storage.getSessionTitle());
        ret.put("sessionId", storage.getSessionId());
        ret.put("endReason", storage.getEndReason());
        call.resolve(ret);
    }

    private boolean isAccessibilityEnabled(Context context) {
        AccessibilityManager am = (AccessibilityManager) context.getSystemService(Context.ACCESSIBILITY_SERVICE);
        if (am == null) return false;

        List<AccessibilityServiceInfo> runningServices = am.getEnabledAccessibilityServiceList(
                AccessibilityServiceInfo.FEEDBACK_GENERIC
        );

        String myServiceName = DoflowAccessibilityBlockerService.class.getSimpleName();
        for (AccessibilityServiceInfo service : runningServices) {
            if (service.getId() != null && service.getId().contains(myServiceName)) {
                return true;
            }
        }
        return false;
    }
}
