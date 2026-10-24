import Foundation
import Capacitor
#if canImport(FamilyControls)
import FamilyControls
#endif
#if canImport(ManagedSettings)
import ManagedSettings
#endif

@objc(DoflowFocusLockPlugin)
public class DoflowFocusLockPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DoflowFocusLockPlugin"
    public let jsName = "DoflowFocusLock"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPermissionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAccessibilityPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestBatteryExemption", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getInstalledApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startFocusLock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopFocusLock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLockStatus", returnType: CAPPluginReturnPromise)
    ]

    private let storage = FocusLockStorage.shared

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve([
            "available": true,
            "platform": "ios"
        ])
    }

    @objc func getPermissionStatus(_ call: CAPPluginCall) {
        var hasAuthorization = false
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            hasAuthorization = AuthorizationCenter.shared.authorizationStatus == .approved
        }
        #endif

        call.resolve([
            "hasAccessibility": hasAuthorization,
            "hasNotification": true,
            "isIgnoringBatteryOptimizations": true,
            "allPermissionsGranted": hasAuthorization
        ])
    }

    @objc func requestAccessibilityPermission(_ call: CAPPluginCall) {
        #if canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            Task {
                do {
                    try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                    call.resolve(["opened": true])
                } catch {
                    call.resolve(["opened": false, "error": error.localizedDescription])
                }
            }
            return
        }
        #endif
        call.resolve(["opened": true])
    }

    @objc func requestBatteryExemption(_ call: CAPPluginCall) {
        // Battery optimization exemption is not required/supported on iOS
        call.resolve(["opened": true])
    }

    @objc func getInstalledApps(_ call: CAPPluginCall) {
        // iOS restricts querying installed third-party apps directly via bundle ID due to privacy sandboxing.
        // Screen Time / FamilyActivityPicker uses tokens.
        let defaultApps: [[String: Any]] = [
            ["id": "com.burbn.instagram", "name": "Instagram", "packageName": "com.burbn.instagram", "category": "social"],
            ["id": "com.zhiliaoapp.musically", "name": "TikTok", "packageName": "com.zhiliaoapp.musically", "category": "social"],
            ["id": "com.atebits.Tweetie2", "name": "X (Twitter)", "packageName": "com.atebits.Tweetie2", "category": "social"],
            ["id": "com.facebook.Facebook", "name": "Facebook", "packageName": "com.facebook.Facebook", "category": "social"],
            ["id": "com.reddit.Reddit", "name": "Reddit", "packageName": "com.reddit.Reddit", "category": "social"],
            ["id": "com.toyopagroup.picaboo", "name": "Snapchat", "packageName": "com.toyopagroup.picaboo", "category": "social"],
            ["id": "com.google.ios.youtube", "name": "YouTube", "packageName": "com.google.ios.youtube", "category": "entertainment"],
            ["id": "com.netflix.Netflix", "name": "Netflix", "packageName": "com.netflix.Netflix", "category": "entertainment"],
            ["id": "tv.twitch", "name": "Twitch", "packageName": "tv.twitch", "category": "entertainment"],
            ["id": "com.hammerandchisel.discord", "name": "Discord", "packageName": "com.hammerandchisel.discord", "category": "messaging"]
        ]

        call.resolve([
            "apps": defaultApps,
            "totalCount": defaultApps.count
        ])
    }

    @objc func startFocusLock(_ call: CAPPluginCall) {
        let durationMs = call.getDouble("durationMs") ?? (25.0 * 60.0 * 1000.0)
        let sessionTitle = call.getString("sessionTitle") ?? "Focus Session"
        let sessionId = call.getString("sessionId") ?? "ios_\(Int(Date().timeIntervalSince1970 * 1000))"
        let blockedPackages = call.getArray("blockedPackages", String.self) ?? []

        // Persist session state
        storage.startSession(
            sessionId: sessionId,
            durationMs: durationMs,
            title: sessionTitle,
            blockedApps: blockedPackages
        )

        #if canImport(ManagedSettings)
        if #available(iOS 16.0, *) {
            let store = ManagedSettingsStore()
            // When tokens are available via FamilyActivitySelection, store.shield.applications is set.
            // Clear any previous shields first to ensure clean state
            store.shield.applications = nil
            store.shield.applicationCategories = nil
        }
        #endif

        call.resolve([
            "success": true,
            "isLocked": true,
            "blockedCount": blockedPackages.count,
            "sessionId": sessionId
        ])
    }

    @objc func stopFocusLock(_ call: CAPPluginCall) {
        // Immediately de-escalate and lift restrictions
        #if canImport(ManagedSettings)
        if #available(iOS 16.0, *) {
            let store = ManagedSettingsStore()
            store.shield.applications = nil
            store.shield.applicationCategories = nil
            store.shield.webDomains = nil
        }
        #endif

        storage.stopSession(reason: "user_manual_unlock")

        call.resolve([
            "success": true,
            "isLocked": false
        ])
    }

    @objc func getLockStatus(_ call: CAPPluginCall) {
        let isActive = storage.isSessionActive()
        let remaining = storage.getRemainingMs()
        let count = storage.getBlockedApps().count
        let title = storage.getSessionTitle()
        let sessionId = storage.getSessionId()

        call.resolve([
            "isLocked": isActive,
            "remainingMs": remaining,
            "blockedCount": count,
            "sessionTitle": title,
            "sessionId": sessionId
        ])
    }
}
