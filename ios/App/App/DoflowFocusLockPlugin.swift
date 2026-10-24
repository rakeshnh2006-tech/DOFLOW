import Foundation
import Capacitor
#if canImport(FamilyControls)
import FamilyControls
#endif
#if canImport(ManagedSettings)
import ManagedSettings
#endif
#if canImport(SwiftUI) && canImport(FamilyControls)
import SwiftUI
#endif

#if canImport(SwiftUI) && canImport(FamilyControls)
@available(iOS 16.0, *)
struct FamilyPickerSwiftUIView: View {
    @State var selection: FamilyActivitySelection
    var onDone: (FamilyActivitySelection) -> Void
    var onCancel: () -> Void

    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $selection)
                .navigationTitle("Select Distracting Apps")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            onCancel()
                        }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            onDone(selection)
                        }
                    }
                }
        }
    }
}

@available(iOS 16.0, *)
class FamilyPickerHostController: UIHostingController<FamilyPickerSwiftUIView> {
    init(onDone: @escaping (FamilyActivitySelection) -> Void, onCancel: @escaping () -> Void) {
        var initialSelection = FamilyActivitySelection()
        if let data = FocusLockStorage.shared.loadFamilySelectionData(),
           let decoded = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data) {
            initialSelection = decoded
        }

        var onDoneHolder: ((FamilyActivitySelection) -> Void)?
        var onCancelHolder: (() -> Void)?

        let rootView = FamilyPickerSwiftUIView(
            selection: initialSelection,
            onDone: { sel in
                onDoneHolder?(sel)
            },
            onCancel: {
                onCancelHolder?()
            }
        )
        super.init(rootView: rootView)

        onDoneHolder = { [weak self] sel in
            self?.dismiss(animated: true) {
                onDone(sel)
            }
        }
        onCancelHolder = { [weak self] in
            self?.dismiss(animated: true) {
                onCancel()
            }
        }
    }

    @MainActor required dynamic init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
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
        CAPPluginMethod(name: "selectAppsWithFamilyPicker", returnType: CAPPluginReturnPromise),
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
        call.resolve(["opened": true])
    }

    @objc func getInstalledApps(_ call: CAPPluginCall) {
        // iOS restricts querying third-party installed apps via bundle ID for privacy.
        // Screen Time requires the system FamilyActivityPicker sheet.
        call.resolve([
            "apps": [],
            "totalCount": 0
        ])
    }

    @objc func selectAppsWithFamilyPicker(_ call: CAPPluginCall) {
        #if canImport(FamilyControls) && canImport(SwiftUI)
        if #available(iOS 16.0, *) {
            DispatchQueue.main.async { [weak self] in
                guard let self = self, let bridge = self.bridge, let viewController = bridge.viewController else {
                    call.reject("Cannot access root view controller")
                    return
                }

                let pickerVC = FamilyPickerHostController { (selection: FamilyActivitySelection) in
                    if let data = try? PropertyListEncoder().encode(selection) {
                        self.storage.saveFamilySelectionData(data)
                    }
                    call.resolve([
                        "success": true,
                        "applicationCount": selection.applicationTokens.count,
                        "categoryCount": selection.categoryTokens.count,
                        "totalSelected": selection.applicationTokens.count + selection.categoryTokens.count
                    ])
                } onCancel: {
                    call.resolve([
                        "success": false,
                        "applicationCount": 0,
                        "categoryCount": 0,
                        "totalSelected": 0,
                        "error": "User cancelled app picker"
                    ])
                }

                viewController.present(pickerVC, animated: true)
            }
            return
        }
        #endif

        call.resolve([
            "success": false,
            "applicationCount": 0,
            "categoryCount": 0,
            "totalSelected": 0,
            "error": "FamilyControls not supported on this iOS version."
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

        var blockedCount = blockedPackages.count

        #if canImport(ManagedSettings) && canImport(FamilyControls)
        if #available(iOS 16.0, *) {
            let store = ManagedSettingsStore()
            if let data = storage.loadFamilySelectionData(),
               let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data) {
                store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
                store.shield.applicationCategories = selection.categoryTokens.isEmpty ? nil : .specific(selection.categoryTokens)
                blockedCount = selection.applicationTokens.count
            } else {
                store.shield.applications = nil
                store.shield.applicationCategories = nil
            }
        }
        #endif

        call.resolve([
            "success": true,
            "isLocked": true,
            "blockedCount": blockedCount,
            "sessionId": sessionId
        ])
    }

    @objc func stopFocusLock(_ call: CAPPluginCall) {
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
