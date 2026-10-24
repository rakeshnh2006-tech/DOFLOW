import React, { useState, useMemo } from 'react';
import type { AppCategory, DistractingApp, FocusLockSettings } from '../types/focusLock';

interface FocusLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: FocusLockSettings;
  onSaveSettings: (settings: FocusLockSettings) => void;
  availableApps: DistractingApp[];
  selectedAppIds: string[];
  onToggleApp: (appId: string) => void;
  onSelectAll: (appIds?: string[]) => void;
  onDeselectAll: () => void;
  onSelectCategory: (category: AppCategory) => void;
  onAddCustomApp: (name: string, category?: AppCategory, domainOrPackage?: string) => void;
  onRemoveCustomApp: (appId: string) => void;
  platform: 'web' | 'android' | 'ios';
  isLocked: boolean;
  androidPermissions?: {
    hasAccessibility: boolean;
    hasNotification: boolean;
    isIgnoringBatteryOptimizations: boolean;
    allPermissionsGranted: boolean;
  } | null;
  onRequestAccessibility?: () => void;
  onRequestBatteryExemption?: () => void;
}

export const FocusLockModal: React.FC<FocusLockModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  availableApps,
  selectedAppIds,
  onToggleApp,
  onSelectAll,
  onDeselectAll,
  onSelectCategory,
  onAddCustomApp,
  onRemoveCustomApp,
  platform,
  isLocked,
  androidPermissions,
  onRequestAccessibility,
  onRequestBatteryExemption,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | AppCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customAppName, setCustomAppName] = useState('');
  const [customAppDomain, setCustomAppDomain] = useState('');
  const [customCategory, setCustomCategory] = useState<AppCategory>('custom');
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Filter apps based on active category tab and search query
  const filteredApps = useMemo(() => {
    return availableApps.filter((app) => {
      const matchesCategory = activeTab === 'all' || app.category === activeTab;
      const matchesSearch =
        !searchQuery.trim() ||
        app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (app.webDomain && app.webDomain.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [availableApps, activeTab, searchQuery]);

  const handleToggleEnabled = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSaveSettings({
      ...settings,
      enabled: e.target.checked,
    });
  };

  const handleToggleConfirmEarlyExit = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSaveSettings({
      ...settings,
      confirmEarlyExit: e.target.checked,
    });
  };

  const handleAddCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAppName.trim()) return;
    onAddCustomApp(customAppName.trim(), customCategory, customAppDomain.trim() || undefined);
    setCustomAppName('');
    setCustomAppDomain('');
    setShowAddCustom(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop focus-lock-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focus-lock-modal-title"
      data-testid="focus-lock-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-content focus-lock-modal-content">
        <div className="modal-header">
          <div className="focus-lock-modal-title-group">
            <div className="focus-lock-icon-badge" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2 id="focus-lock-modal-title" className="modal-title">
                Doflow Focus Lock
              </h2>
              <p className="focus-lock-subtitle">
                Select apps to block and protect your deep work sessions
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close Focus Lock settings"
            data-testid="close-focus-lock-modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body focus-lock-modal-body">
          {/* Main Enable / Disable Toggle */}
          <div className="focus-lock-toggle-card">
            <div className="focus-lock-toggle-info">
              <label htmlFor="focus-lock-master-toggle" className="focus-lock-toggle-label">
                Enable Focus Lock during Focus Sessions
              </label>
              <p className="focus-lock-toggle-desc">
                When active, distracting apps are locked until your countdown completes or you manually end the session.
              </p>
            </div>
            <label className="switch-toggle" htmlFor="focus-lock-master-toggle">
              <input
                id="focus-lock-master-toggle"
                type="checkbox"
                checked={settings.enabled}
                onChange={handleToggleEnabled}
                data-testid="focus-lock-enabled-toggle"
              />
              <span className="slider-round" />
            </label>
          </div>

          {/* Platform Capabilities Transparency Notice */}
          <div className="focus-lock-platform-notice">
            <div className="notice-icon" aria-hidden="true">
              {platform === 'web' ? '🌐' : '📱'}
            </div>
            <div className="notice-content">
              <strong>
                {platform === 'web'
                  ? 'Web Focus Mode'
                  : platform === 'android'
                  ? 'Android App Blocker'
                  : 'iOS Screen Time Restriction'}
              </strong>
              <p>
                {platform === 'web'
                  ? 'Running in web browser. Doflow provides tab focus shielding, session countdown badges, and anti-distraction alerts. OS-level native app blocking requires the Doflow Android/iOS native app.'
                  : 'System-level distraction protection is active. Blocked applications will be restricted while your Pomodoro timer is running.'}
              </p>
            </div>
          </div>

          {/* Android Permissions Onboarding Panel (Requirement 1, 8, 9) */}
          {platform === 'android' && (
            <div className="android-permissions-panel" data-testid="android-permissions-panel">
              <div className="permissions-panel-header">
                <span className="permissions-panel-title">Android System Permissions</span>
                <span className="permissions-panel-desc">
                  Android requires explicit user authorization to detect when blocked apps are opened and keep focus sessions active.
                </span>
              </div>

              <div className="permission-row">
                <div className="permission-info">
                  <div className="permission-title-group">
                    <span className="permission-name">Accessibility Blocker Service</span>
                    <span className={`permission-badge ${androidPermissions?.hasAccessibility ? 'granted' : 'needed'}`}>
                      {androidPermissions?.hasAccessibility ? '✓ Enabled' : '⚠ Action Needed'}
                    </span>
                  </div>
                  <p className="permission-subtext">
                    Required to detect when selected distracting apps enter the foreground and display the Doflow Focus Shield. Doflow never records screen content, passwords, or personal data.
                  </p>
                </div>
                {!androidPermissions?.hasAccessibility && onRequestAccessibility && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm btn-permission"
                    onClick={onRequestAccessibility}
                    data-testid="enable-accessibility-btn"
                  >
                    Open Settings →
                  </button>
                )}
              </div>

              <div className="permission-row">
                <div className="permission-info">
                  <div className="permission-title-group">
                    <span className="permission-name">Battery Optimization Exemption</span>
                    <span className={`permission-badge ${androidPermissions?.isIgnoringBatteryOptimizations ? 'granted' : 'needed'}`}>
                      {androidPermissions?.isIgnoringBatteryOptimizations ? '✓ Unrestricted' : '⚠ Recommended'}
                    </span>
                  </div>
                  <p className="permission-subtext">
                    Prevents Android Doze mode from stopping your active Pomodoro session when your device screen is locked or idle.
                  </p>
                </div>
                {!androidPermissions?.isIgnoringBatteryOptimizations && onRequestBatteryExemption && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm btn-permission"
                    onClick={onRequestBatteryExemption}
                    data-testid="exempt-battery-btn"
                  >
                    Exempt →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Category Tabs & Quick Select */}
          <div className="focus-lock-controls-row">
            <div className="focus-lock-category-tabs" role="tablist" aria-label="App categories">
              <button
                type="button"
                className={`category-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All ({availableApps.length})
              </button>
              <button
                type="button"
                className={`category-tab-btn ${activeTab === 'social' ? 'active' : ''}`}
                onClick={() => setActiveTab('social')}
              >
                Social
              </button>
              <button
                type="button"
                className={`category-tab-btn ${activeTab === 'entertainment' ? 'active' : ''}`}
                onClick={() => setActiveTab('entertainment')}
              >
                Video & Media
              </button>
              <button
                type="button"
                className={`category-tab-btn ${activeTab === 'messaging' ? 'active' : ''}`}
                onClick={() => setActiveTab('messaging')}
              >
                Messaging
              </button>
              <button
                type="button"
                className={`category-tab-btn ${activeTab === 'gaming' ? 'active' : ''}`}
                onClick={() => setActiveTab('gaming')}
              >
                Games
              </button>
            </div>

            <div className="focus-lock-bulk-actions">
              <button
                type="button"
                className="btn-link-action"
                onClick={() => onSelectAll(filteredApps.map((a) => a.id))}
                data-testid="select-all-apps-btn"
              >
                Select Filtered
              </button>
              <span className="action-divider">•</span>
              <button
                type="button"
                className="btn-link-action"
                onClick={onDeselectAll}
                data-testid="deselect-all-apps-btn"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="focus-lock-search-wrapper">
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="focus-lock-search-input"
              placeholder="Search distracting apps or sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search distracting apps"
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Selected Apps Counter Badge */}
          <div className="focus-lock-stats-summary">
            <span className="stats-badge" data-testid="selected-apps-count">
              <strong>{selectedAppIds.length}</strong> of {availableApps.length} apps selected for blocking
            </span>
            {activeTab !== 'all' && (
              <button
                type="button"
                className="btn-select-category"
                onClick={() => onSelectCategory(activeTab)}
              >
                Toggle All {activeTab}
              </button>
            )}
          </div>

          {/* App Selection Grid */}
          <div className="focus-lock-app-grid" role="group" aria-label="List of apps to block">
            {filteredApps.length === 0 ? (
              <div className="no-apps-found">
                <p>No apps match "{searchQuery}"</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddCustom(true)}
                >
                  + Add "{searchQuery}" as Custom App
                </button>
              </div>
            ) : (
              filteredApps.map((app) => {
                const isSelected = selectedAppIds.includes(app.id);
                return (
                  <div
                    key={app.id}
                    className={`app-item-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => onToggleApp(app.id)}
                    role="checkbox"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        onToggleApp(app.id);
                      }
                    }}
                    data-testid={`app-item-${app.id}`}
                  >
                    <div className="app-item-left">
                      <div className="app-custom-checkbox">
                        {isSelected && (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="app-item-details">
                        <span className="app-name">{app.name}</span>
                        <span className="app-category-tag">{app.category}</span>
                      </div>
                    </div>

                    {app.isCustom && (
                      <button
                        type="button"
                        className="btn-delete-custom-app"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveCustomApp(app.id);
                        }}
                        aria-label={`Remove custom app ${app.name}`}
                        title="Remove custom app"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Add Custom App Form */}
          <div className="custom-app-section">
            {!showAddCustom ? (
              <button
                type="button"
                className="btn-add-custom-app-toggle"
                onClick={() => setShowAddCustom(true)}
              >
                + Add Custom App or Website Domain
              </button>
            ) : (
              <form onSubmit={handleAddCustomSubmit} className="add-custom-form">
                <h4 className="custom-form-title">Add Distracting App or Domain</h4>
                <div className="custom-form-inputs">
                  <input
                    type="text"
                    className="custom-input"
                    placeholder="App or Site Name (e.g. Threads)"
                    value={customAppName}
                    onChange={(e) => setCustomAppName(e.target.value)}
                    required
                    autoFocus
                  />
                  <input
                    type="text"
                    className="custom-input"
                    placeholder="Domain or Package (e.g. threads.net)"
                    value={customAppDomain}
                    onChange={(e) => setCustomAppDomain(e.target.value)}
                  />
                  <select
                    className="custom-select"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as AppCategory)}
                  >
                    <option value="social">Social</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="messaging">Messaging</option>
                    <option value="gaming">Gaming</option>
                    <option value="custom">Other</option>
                  </select>
                </div>
                <div className="custom-form-actions">
                  <button type="submit" className="btn btn-primary btn-sm">
                    Add to Blocklist
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowAddCustom(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Strict Mode / Safe Exit Toggle */}
          <div className="focus-lock-exit-setting">
            <div className="setting-info">
              <label htmlFor="confirm-early-exit-toggle" className="setting-label">
                Confirm Before Ending Session Early
              </label>
              <p className="setting-desc">
                Prompts for confirmation when tapping "End Session" to help prevent reflexive interruptions while preserving your full freedom to exit anytime.
              </p>
            </div>
            <label className="switch-toggle" htmlFor="confirm-early-exit-toggle">
              <input
                id="confirm-early-exit-toggle"
                type="checkbox"
                checked={settings.confirmEarlyExit}
                onChange={handleToggleConfirmEarlyExit}
              />
              <span className="slider-round" />
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <div className="modal-footer-info">
            {isLocked && (
              <span className="locked-session-badge">
                🔒 Focus Lock is actively protecting your current session
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-done"
            onClick={onClose}
            data-testid="save-focus-lock-btn"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
