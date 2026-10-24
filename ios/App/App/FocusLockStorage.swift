import Foundation

/**
 * Thread-safe persistent storage for Doflow Focus Lock state on iOS.
 * Accessible across the main app process and Screen Time / Shield extensions
 * via App Group UserDefaults or standard UserDefaults.
 */
public class FocusLockStorage {
    public static let shared = FocusLockStorage()

    private let userDefaults: UserDefaults

    private let keyIsSessionActive = "doflow_is_session_active"
    private let keySessionId = "doflow_session_id"
    private let keySessionStartTime = "doflow_session_start_time"
    private let keySessionEndTime = "doflow_session_end_time"
    private let keySessionTitle = "doflow_session_title"
    private let keyBlockedApps = "doflow_blocked_apps"
    private let keyEndReason = "doflow_end_reason"

    public init() {
        // Fallback to standard UserDefaults if App Group suite is not yet configured
        if let groupDefaults = UserDefaults(suiteName: "group.com.doflow.app") {
            self.userDefaults = groupDefaults
        } else {
            self.userDefaults = UserDefaults.standard
        }
    }

    public func startSession(sessionId: String, durationMs: Double, title: String, blockedApps: [String]) {
        let now = Date().timeIntervalSince1970 * 1000.0
        let endTime = now + max(0.0, durationMs)

        userDefaults.set(true, forKey: keyIsSessionActive)
        userDefaults.set(sessionId, forKey: keySessionId)
        userDefaults.set(now, forKey: keySessionStartTime)
        userDefaults.set(endTime, forKey: keySessionEndTime)
        userDefaults.set(title.isEmpty ? "Focus Session" : title, forKey: keySessionTitle)
        userDefaults.set(blockedApps, forKey: keyBlockedApps)
        userDefaults.removeObject(forKey: keyEndReason)
        userDefaults.synchronize()
    }

    public func stopSession(reason: String = "user_manual_unlock") {
        userDefaults.set(false, forKey: keyIsSessionActive)
        userDefaults.set(0.0, forKey: keySessionStartTime)
        userDefaults.set(0.0, forKey: keySessionEndTime)
        userDefaults.set(reason, forKey: keyEndReason)
        userDefaults.synchronize()
    }

    public func isSessionActive() -> Bool {
        guard userDefaults.bool(forKey: keyIsSessionActive) else {
            return false
        }

        let endTime = userDefaults.double(forKey: keySessionEndTime)
        let now = Date().timeIntervalSince1970 * 1000.0

        if endTime > 0 && now >= endTime {
            stopSession(reason: "timer_completed")
            return false
        }

        return true
    }

    public func getRemainingMs() -> Double {
        guard isSessionActive() else { return 0.0 }
        let endTime = userDefaults.double(forKey: keySessionEndTime)
        let now = Date().timeIntervalSince1970 * 1000.0
        return max(0.0, endTime - now)
    }

    public func getSessionId() -> String {
        return userDefaults.string(forKey: keySessionId) ?? ""
    }

    public func getSessionTitle() -> String {
        return userDefaults.string(forKey: keySessionTitle) ?? "Deep Work Session"
    }

    public func getBlockedApps() -> [String] {
        return userDefaults.stringArray(forKey: keyBlockedApps) ?? []
    }

    private var keyFamilySelection: String { "doflow_family_activity_selection" }

    public func saveFamilySelectionData(_ data: Data) {
        userDefaults.set(data, forKey: keyFamilySelection)
        userDefaults.synchronize()
    }

    public func loadFamilySelectionData() -> Data? {
        return userDefaults.data(forKey: keyFamilySelection)
    }
}
