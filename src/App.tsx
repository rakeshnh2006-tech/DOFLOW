import React, { useCallback, useRef, useState } from 'react';
import { Header } from './components/Header';
import { FocusTimer } from './components/FocusTimer';
import { TaskManager } from './components/TaskManager';
import { DailyStats } from './components/DailyStats';
import { DailyPlanner } from './components/DailyPlanner';
import { WeeklyAnalytics } from './components/WeeklyAnalytics';
import { SoundscapePanel } from './components/SoundscapePanel';
import { HabitManager } from './components/HabitManager';
import { GoalsManager } from './components/GoalsManager';
import { FlowIntelligenceDashboard } from './components/FlowIntelligenceDashboard';
import { SessionReflectionModal } from './components/SessionReflectionModal';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsConditionsPage } from './components/TermsConditionsPage';
import { GoogleLoginPage } from './components/GoogleLoginPage';
import { SettingsModal } from './components/SettingsModal';
import { RunningTimerSettingModal } from './components/RunningTimerSettingModal';
import { FocusLockModal } from './components/FocusLockModal';
import { FocusLockEndEarlyModal } from './components/FocusLockEndEarlyModal';
import { useTasks } from './hooks/useTasks';
import { useProductivityStats } from './hooks/useProductivityStats';
import { usePreferences } from './hooks/usePreferences';
import { usePlanner } from './hooks/usePlanner';
import { useSoundscape } from './hooks/useSoundscape';
import { useHabits } from './hooks/useHabits';
import { useGoals } from './hooks/useGoals';
import { useFlowIntelligence } from './hooks/useFlowIntelligence';
import { useAuth } from './hooks/useAuth';
import { useFocusLock } from './hooks/useFocusLock';
import { clearAllDoflowData } from './utils/dataManagement';
import { DEFAULT_PREFERENCES } from './types/settings';
import { DEFAULT_DAILY_GOALS } from './utils/goalsStorage';
import type { TimerMode, TimerStatus } from './types/timer';
import type { UserPreferences } from './types/settings';
import type { AppView } from './components/Header';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('timer');
  const taskState = useTasks();
  const statsState = useProductivityStats({ tasks: taskState.tasks });
  const preferencesState = usePreferences();
  const soundscapeState = useSoundscape();
  const habitsState = useHabits();
  const plannerState = usePlanner({
    tasks: taskState.tasks,
    activeTaskId: taskState.activeTaskId,
    addTask: taskState.addTask,
    updateTaskTitle: taskState.updateTaskTitle,
    toggleTask: taskState.toggleTask,
    deleteTask: taskState.deleteTask,
    selectActiveTask: taskState.selectActiveTask,
  });
  const goalsState = useGoals({
    sessionHistory: statsState.sessionHistory,
    todayStats: statsState.todayStats,
    tasks: taskState.tasks,
    habits: habitsState.habitsWithStreaks,
    plannerTasks: plannerState.plannedTasks,
  });
  const authState = useAuth();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRunningDurationModalOpen, setIsRunningDurationModalOpen] = useState(false);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [timerMode, setTimerMode] = useState<TimerMode>('focus');

  const pendingPreferencesRef = useRef<UserPreferences | null>(null);
  const resetTimerRef = useRef<((newDuration?: number) => void) | null>(null);

  const handleManualEndSession = useCallback(() => {
    resetTimerRef.current?.();
  }, []);

  const focusLockState = useFocusLock({
    user: authState.user,
    onManualEndSession: handleManualEndSession,
  });

  const handleTimerStatusChange = useCallback(
    (newStatus: TimerStatus) => {
      setTimerStatus(newStatus);
      if (newStatus === 'running' && timerMode === 'focus') {
        if (focusLockState.status === 'paused') {
          focusLockState.resumeSessionLock();
        } else if (!focusLockState.isActive) {
          focusLockState.startSessionLock(preferencesState.durationsMs.focus);
        }
      } else if (newStatus === 'paused' && timerMode === 'focus') {
        if (focusLockState.isActive) {
          focusLockState.pauseSessionLock();
        }
      } else if (newStatus === 'idle') {
        if (focusLockState.isActive) {
          focusLockState.endSessionLock('timer_reset');
        }
      } else if (newStatus === 'completed') {
        if (focusLockState.isActive) {
          focusLockState.completeSessionLock();
        }
      }
    },
    [focusLockState, preferencesState.durationsMs.focus, timerMode]
  );

  const handleTimerModeChange = useCallback(
    (newMode: TimerMode) => {
      setTimerMode(newMode);
      if (newMode !== 'focus' && focusLockState.isActive) {
        focusLockState.endSessionLock('mode_switched');
      }
    },
    [focusLockState]
  );

  const handleSaveSettings = useCallback(
    (newPrefs: UserPreferences) => {
      const currentPrefs = preferencesState.preferences;
      const durationsChanged =
        currentPrefs.focusDurationMinutes !== newPrefs.focusDurationMinutes ||
        currentPrefs.shortBreakDurationMinutes !== newPrefs.shortBreakDurationMinutes ||
        currentPrefs.longBreakDurationMinutes !== newPrefs.longBreakDurationMinutes;

      // If timer is running or paused and durations changed, ask user before modifying active session
      if (durationsChanged && (timerStatus === 'running' || timerStatus === 'paused')) {
        pendingPreferencesRef.current = newPrefs;
        setIsSettingsOpen(false);
        setIsRunningDurationModalOpen(true);
      } else {
        // Idle or completed: apply settings immediately
        preferencesState.updatePreferences(newPrefs);
        setIsSettingsOpen(false);
      }
    },
    [preferencesState, timerStatus]
  );

  const handleApplyNextSession = useCallback(() => {
    if (pendingPreferencesRef.current) {
      preferencesState.updatePreferences(pendingPreferencesRef.current);
      pendingPreferencesRef.current = null;
    }
    setIsRunningDurationModalOpen(false);
  }, [preferencesState]);

  const handleApplyCurrentSession = useCallback(() => {
    if (pendingPreferencesRef.current) {
      const newDurationMinutes =
        timerMode === 'focus'
          ? pendingPreferencesRef.current.focusDurationMinutes
          : timerMode === 'shortBreak'
          ? pendingPreferencesRef.current.shortBreakDurationMinutes
          : pendingPreferencesRef.current.longBreakDurationMinutes;
      const targetDurationMs = newDurationMinutes * 60 * 1000;

      preferencesState.updatePreferences(pendingPreferencesRef.current);
      pendingPreferencesRef.current = null;
      // Reset current active timer with new duration
      resetTimerRef.current?.(targetDurationMs);
    }
    setIsRunningDurationModalOpen(false);
  }, [preferencesState, timerMode]);

  const intelligenceState = useFlowIntelligence({
    sessionHistory: statsState.sessionHistory,
    todayStats: statsState.todayStats,
    tasks: taskState.tasks,
    plannedTasks: plannerState.plannedTasks,
    dailyGoals: goalsState.dailyGoals,
    currentPreferences: preferencesState.preferences,
    activeTaskId: taskState.activeTaskId,
    onSelectActiveTask: taskState.selectActiveTask,
    onApplyDurations: (focusMins, shortBreakMins, longBreakMins) => {
      const newPrefs: UserPreferences = {
        ...preferencesState.preferences,
        focusDurationMinutes: focusMins,
        shortBreakDurationMinutes: shortBreakMins,
        longBreakDurationMinutes: longBreakMins,
      };
      handleSaveSettings(newPrefs);
    },
  });

  const handleTimerComplete = useCallback(
    (mode: TimerMode, durationMs?: number) => {
      focusLockState.completeSessionLock();
      // Default to 25 min if durationMs not provided
      const record = statsState.recordCompletedSession(mode, durationMs ?? 25 * 60 * 1000);
      if (record && record.mode === 'focus') {
        intelligenceState.promptSessionReflection(record.id);
      }
    },
    [statsState, intelligenceState, focusLockState]
  );

  const handleClearAllData = useCallback(() => {
    // 1. Delete in-memory tasks
    taskState.tasks.forEach((t) => taskState.deleteTask(t.id));

    // 2. Delete in-memory planned tasks
    plannerState.plannedTasks.forEach((pt) => plannerState.deletePlannedTask(pt.id));

    // 3. Delete in-memory habits
    habitsState.habits.forEach((h) => habitsState.deleteHabit(h.id));

    // 4. Clear stats and history in-memory state
    statsState.clearHistory();

    // 5. Reset preferences to default
    preferencesState.updatePreferences(DEFAULT_PREFERENCES);

    // 6. Stop any playing audio
    soundscapeState.stopAll();

    // 7. Reset daily goals to default
    goalsState.updateDailyGoals(DEFAULT_DAILY_GOALS);

    // 8. Log out current auth session
    authState.logout();

    // 9. Finally, ensure all localStorage keys managed by Doflow are erased
    clearAllDoflowData();
  }, [
    statsState,
    preferencesState,
    soundscapeState,
    taskState,
    plannerState,
    habitsState,
    goalsState,
    authState,
  ]);

  return (
    <div className="app-container">
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        theme={preferencesState.preferences.theme}
        onToggleTheme={preferencesState.toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSoundscapePlaying={soundscapeState.isPlaying}
        soundscapeEnabled={soundscapeState.enabled}
        user={authState.user}
      />

      <div style={{ display: currentView === 'timer' ? 'block' : 'none' }}>
        <FocusTimer
          activeTask={taskState.activeTask}
          durations={preferencesState.durationsMs}
          soundEnabled={preferencesState.preferences.soundEnabled}
          focusLockState={{
            isLocked: focusLockState.isLocked,
            enabled: focusLockState.settings.enabled,
            blockedAppCount: focusLockState.selectedAppsCount,
            status: focusLockState.status,
            remainingDisplay: focusLockState.formattedRemaining.display,
            unlockError: focusLockState.unlockError,
            onOpenConfig: focusLockState.openConfigModal,
            onEndSessionEarly: focusLockState.openEndEarlyModal,
            onRetryUnlock: focusLockState.retryDeactivation,
            platform: focusLockState.platform,
          }}
          onComplete={handleTimerComplete}
          onStatusChange={handleTimerStatusChange}
          onModeChange={handleTimerModeChange}
          resetTimerRef={resetTimerRef}
        />

        <DailyStats stats={statsState.todayStats} />
        <TaskManager taskState={taskState} />
      </div>

      {currentView === 'planner' && (
        <DailyPlanner
          plannerState={plannerState}
          activeTaskId={taskState.activeTaskId}
        />
      )}

      {currentView === 'analytics' && (
        <WeeklyAnalytics
          sessionHistory={statsState.sessionHistory}
          tasks={taskState.tasks}
          onNavigate={setCurrentView}
        />
      )}

      {currentView === 'soundscape' && (
        <SoundscapePanel soundscapeState={soundscapeState} />
      )}

      {currentView === 'habits' && (
        <HabitManager habitsState={habitsState} />
      )}

      {currentView === 'goals' && (
        <GoalsManager goalsState={goalsState} />
      )}

      {currentView === 'intelligence' && (
        <FlowIntelligenceDashboard
          intelligenceState={intelligenceState}
          todayStats={statsState.todayStats}
          tasks={taskState.tasks}
          activeTaskId={taskState.activeTaskId}
          preferences={preferencesState.preferences}
          onNavigateToTimer={() => setCurrentView('timer')}
          onSelectActiveTask={taskState.selectActiveTask}
        />
      )}

      {currentView === 'privacy' && (
        <PrivacyPolicyPage
          onBack={() => setCurrentView('timer')}
          onClearAllData={handleClearAllData}
          onNavigateToTerms={() => setCurrentView('terms')}
        />
      )}

      {currentView === 'terms' && (
        <TermsConditionsPage
          onBack={() => setCurrentView('timer')}
          onNavigateToPrivacy={() => setCurrentView('privacy')}
        />
      )}

      {currentView === 'login' && (
        <GoogleLoginPage
          user={authState.user}
          isLoading={authState.isLoading}
          isSyncing={authState.isSyncing}
          error={authState.error}
          googleClientId={authState.googleClientId}
          onUpdateGoogleClientId={authState.updateGoogleClientId}
          onCredentialResponse={authState.handleCredentialResponse}
          onLoginWithGoogle={authState.loginWithGoogle}
          onLogout={authState.logout}
          onSyncData={async () => {
            await authState.syncData();
            await focusLockState.syncFocusLock();
          }}
          onClearError={authState.clearError}
          onBack={() => setCurrentView('timer')}
          onNavigateToPrivacy={() => setCurrentView('privacy')}
          onNavigateToTerms={() => setCurrentView('terms')}
          statsSummary={{
            sessionCount: statsState.sessionHistory.length,
            habitsCount: habitsState.habits.length,
            tasksCount: plannerState.plannedTasks.length + taskState.tasks.length,
            focusLockSessionsCount: focusLockState.sessionHistory.length,
          }}
        />
      )}

      <footer className="app-footer">
        <p className="footer-note">Doflow • Find your flow.</p>
        <div className="footer-legal-links">
          <button
            type="button"
            className="footer-legal-link"
            data-testid="footer-login-link"
            onClick={() => setCurrentView('login')}
          >
            {authState.user ? 'Google Account' : 'Sign in with Google'}
          </button>
          <span className="footer-legal-divider" aria-hidden="true">•</span>
          <button
            type="button"
            className="footer-legal-link"
            data-testid="footer-privacy-link"
            onClick={() => setCurrentView('privacy')}
          >
            Privacy Policy
          </button>
          <span className="footer-legal-divider" aria-hidden="true">•</span>
          <button
            type="button"
            className="footer-legal-link"
            data-testid="footer-terms-link"
            onClick={() => setCurrentView('terms')}
          >
            Terms & Conditions
          </button>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        preferences={preferencesState.preferences}
        onSave={handleSaveSettings}
        onClose={() => setIsSettingsOpen(false)}
        soundscapeEnabled={soundscapeState.enabled}
        onToggleSoundscapeEnabled={soundscapeState.setEnabled}
        onNavigateLegal={setCurrentView}
        onOpenFocusLock={focusLockState.openConfigModal}
      />

      {/* Focus Lock App Selection & Settings Modal */}
      <FocusLockModal
        isOpen={focusLockState.isConfigModalOpen}
        onClose={focusLockState.closeConfigModal}
        settings={focusLockState.settings}
        onSaveSettings={focusLockState.updateSettings}
        availableApps={focusLockState.availableApps}
        selectedAppIds={focusLockState.selectedAppIds}
        onToggleApp={focusLockState.toggleApp}
        onSelectAll={focusLockState.selectAllApps}
        onDeselectAll={focusLockState.deselectAllApps}
        onSelectCategory={focusLockState.selectCategory}
        onAddCustomApp={focusLockState.addCustomApp}
        onRemoveCustomApp={focusLockState.removeCustomApp}
        platform={focusLockState.platform}
        isLocked={focusLockState.isLocked}
        androidPermissions={focusLockState.androidPermissions}
        onRequestAccessibility={focusLockState.requestAccessibilityPermission}
        onRequestBatteryExemption={focusLockState.requestBatteryExemption}
        onSelectWithIosPicker={focusLockState.selectIosAppsWithFamilyPicker}
        iosActivitySummary={focusLockState.iosActivitySummary}
      />

      {/* Confirmation prompt when user chooses to end session early */}
      <FocusLockEndEarlyModal
        isOpen={focusLockState.isEndEarlyModalOpen}
        onCancel={focusLockState.closeEndEarlyModal}
        onConfirm={focusLockState.confirmEndEarly}
        remainingMinutes={Math.ceil(focusLockState.remainingMs / 60000)}
        remainingDisplay={focusLockState.formattedRemaining.display}
        isUnlocking={focusLockState.isUnlocking}
        unlockError={focusLockState.unlockError}
        onRetryUnlock={focusLockState.retryDeactivation}
        blockedAppCount={focusLockState.selectedAppsCount}
      />

      {/* Confirmation prompt when updating durations during an active timer session */}
      <RunningTimerSettingModal
        isOpen={isRunningDurationModalOpen}
        onApplyCurrent={handleApplyCurrentSession}
        onApplyNext={handleApplyNextSession}
      />

      {/* Post-Session Reflection Modal */}
      <SessionReflectionModal
        isOpen={intelligenceState.isReflectionModalOpen}
        sessionId={intelligenceState.pendingReflectionSessionId}
        onSave={intelligenceState.addReflection}
        onSkip={intelligenceState.skipSessionReflection}
      />
    </div>
  );
};

export default App;
