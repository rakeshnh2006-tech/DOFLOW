import React from 'react';
import type { UseFlowIntelligenceReturn } from '../hooks/useFlowIntelligence';
import type { DailyProductivityStats } from '../types/stats';
import type { Task } from '../types/task';
import type { UserPreferences } from '../types/settings';
import { FlowScoreCard } from './FlowScoreCard';
import { TaskRecommendationCard } from './TaskRecommendationCard';
import { PersonalInsightsCard } from './PersonalInsightsCard';
import { AdaptiveSuggestionsCard } from './AdaptiveSuggestionsCard';

interface FlowIntelligenceDashboardProps {
  intelligenceState: UseFlowIntelligenceReturn;
  todayStats: DailyProductivityStats;
  tasks: Task[];
  activeTaskId: string | null;
  preferences: UserPreferences;
  onNavigateToTimer: () => void;
  onSelectActiveTask: (taskId: string) => void;
}

export const FlowIntelligenceDashboard: React.FC<FlowIntelligenceDashboardProps> = ({
  intelligenceState,
  todayStats,
  tasks,
  activeTaskId,
  preferences,
  onNavigateToTimer,
  onSelectActiveTask,
}) => {
  const {
    flowScore,
    primaryRecommendation,
    personalInsights,
    adaptiveSuggestion,
    dismissedTaskIds,
    reflections,
    dismissRecommendation,
    resetDismissals,
    applyAdaptiveSuggestion,
  } = intelligenceState;

  // Filter incomplete tasks for the manual dropdown
  const incompleteTasks = tasks.filter((t) => !t.completed);

  // Filter reflections recorded for today
  const todayReflections = reflections.filter((r) => r.localDate === todayStats.date);

  const handleFocusTask = (taskId: string) => {
    onSelectActiveTask(taskId);
    onNavigateToTimer();
  };

  return (
    <div className="flow-intelligence-page" data-testid="flow-intelligence-page">
      {/* 1. Page Header */}
      <section className="intelligence-header-card">
        <div className="intelligence-header-content">
          <div className="intelligence-header-titles">
            <span className="intelligence-header-badge">Doflow Signature Feature</span>
            <h2 className="intelligence-page-title">Flow Intelligence</h2>
            <p className="intelligence-tagline" data-testid="intelligence-tagline">
              Turn focus into progress.
            </p>
          </div>

          <div className="intelligence-header-meta">
            <span className="intelligence-date-badge" data-testid="intelligence-date-badge">
              {todayStats.date}
            </span>
          </div>
        </div>

        {/* Quick Stats Summary Banner */}
        <div className="intelligence-summary-banner" aria-label="Today focus summary">
          <div className="summary-banner-item" data-testid="summary-focus-minutes">
            <span className="banner-label">Today&rsquo;s Focus Time</span>
            <span className="banner-value">{todayStats.totalFocusMinutes}m</span>
          </div>
          <div className="summary-banner-divider" />
          <div className="summary-banner-item" data-testid="summary-focus-sessions">
            <span className="banner-label">Completed Sessions</span>
            <span className="banner-value">{todayStats.completedFocusSessions}</span>
          </div>
          <div className="summary-banner-divider" />
          <div className="summary-banner-item" data-testid="summary-completed-tasks">
            <span className="banner-label">Tasks Completed</span>
            <span className="banner-value">{todayStats.completedTasks}</span>
          </div>
        </div>
      </section>

      {/* 2. Transparent Flow Score Card */}
      <FlowScoreCard
        score={flowScore}
        todayFocusMinutes={todayStats.totalFocusMinutes}
        todaySessions={todayStats.completedFocusSessions}
      />

      {/* 3. Intelligent Task Recommendations */}
      <TaskRecommendationCard
        primaryRecommendation={primaryRecommendation}
        allEligibleTasks={incompleteTasks}
        activeTaskId={activeTaskId}
        dismissedCount={dismissedTaskIds.length}
        onFocusTask={handleFocusTask}
        onDismissRecommendation={dismissRecommendation}
        onResetDismissals={resetDismissals}
      />

      {/* 4. Personal Productivity Insights */}
      <PersonalInsightsCard insights={personalInsights} />

      {/* 5. Adaptive Duration Suggestions */}
      <AdaptiveSuggestionsCard
        suggestion={adaptiveSuggestion}
        currentFocusMinutes={preferences.focusDurationMinutes}
        currentShortBreakMinutes={preferences.shortBreakDurationMinutes}
        onApply={applyAdaptiveSuggestion}
      />

      {/* 6. Today's Session Reflections Log */}
      <section className="intelligence-card reflections-log-card" data-testid="reflections-log-section">
        <div className="intelligence-card-header">
          <div>
            <span className="intelligence-badge">Session Quality Log</span>
            <h3 className="intelligence-card-title">Today&rsquo;s Reflections</h3>
            <p className="intelligence-card-subtitle">
              Post-session feedback captured after your completed focus sprints.
            </p>
          </div>
          <span className="reflections-count-badge" data-testid="reflections-count-badge">
            {todayReflections.length} {todayReflections.length === 1 ? 'Reflection' : 'Reflections'}
          </span>
        </div>

        {todayReflections.length > 0 ? (
          <div className="reflections-list" data-testid="reflections-list">
            {todayReflections.map((ref) => {
              const qualityIcon =
                ref.quality === 'productive' ? '🟢' : ref.quality === 'distracted' ? '🟡' : '🔴';
              const formattedTime = new Date(ref.completedAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={ref.sessionId} className="reflection-item-card" data-testid={`reflection-item-${ref.sessionId}`}>
                  <div className="reflection-item-top">
                    <span className={`reflection-quality-pill quality-${ref.quality}`}>
                      <span aria-hidden="true">{qualityIcon}</span>
                      <span className="quality-capitalize">{ref.quality}</span>
                    </span>
                    <span className="reflection-timestamp">{formattedTime}</span>
                  </div>

                  {ref.note && (
                    <p className="reflection-note-text" data-testid={`reflection-note-${ref.sessionId}`}>
                      &ldquo;{ref.note}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="reflections-empty-state" data-testid="reflections-empty-state">
            <span className="empty-sparkle" aria-hidden="true">
              💬
            </span>
            <h4 className="empty-title">No session reflections today yet</h4>
            <p className="empty-desc">
              When a focus session finishes, you can capture how your focus felt to build your personalized Flow Intelligence.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
