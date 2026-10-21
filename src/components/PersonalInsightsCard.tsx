import React from 'react';
import type { PersonalProductivityInsights } from '../types/intelligence';

interface PersonalInsightsCardProps {
  insights: PersonalProductivityInsights;
}

export const PersonalInsightsCard: React.FC<PersonalInsightsCardProps> = ({ insights }) => {
  const { peakTimeOfDay, averageDuration, sessionQuality } = insights;

  return (
    <section className="intelligence-card personal-insights-card" data-testid="personal-insights-card">
      <div className="intelligence-card-header">
        <div>
          <span className="intelligence-badge">Behavioral Analytics</span>
          <h3 className="intelligence-card-title">Personal Productivity Insights</h3>
          <p className="intelligence-card-subtitle">
            Patterns derived from your genuine focus sessions and post-session reflections.
          </p>
        </div>
      </div>

      <div className="insights-grid">
        {/* Insight 1: Peak Time of Day */}
        <div className="insight-card-item" data-testid="insight-time-of-day">
          <div className="insight-item-header">
            <h4 className="insight-item-title">Peak Focus Time of Day</h4>
            <span
              className={`evidence-badge ${peakTimeOfDay.isSufficient ? 'badge-sufficient' : 'badge-limited'}`}
              data-testid="evidence-badge-peak"
            >
              {peakTimeOfDay.isSufficient ? 'Evidence Available' : `Needs ${peakTimeOfDay.minimumNeeded} Focus Sessions`}
            </span>
          </div>

          <p className="insight-summary-text" data-testid="peak-time-summary">
            {peakTimeOfDay.summary}
          </p>

          {/* Time Windows Breakdown */}
          <div className="time-windows-bars" aria-label="Time of day focus distribution">
            {peakTimeOfDay.allWindows.map((win) => (
              <div key={win.windowName} className="time-window-bar-row">
                <span className="window-name-label">{win.windowName}</span>
                <div className="window-track">
                  <div
                    className={`window-fill ${
                      peakTimeOfDay.bestWindow?.windowName === win.windowName ? 'best-window-fill' : ''
                    }`}
                    style={{ width: `${win.percentage}%` }}
                  />
                </div>
                <span className="window-minutes-label">
                  {win.focusMinutes}m ({win.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Insight 2: Average Session Duration */}
        <div className="insight-card-item" data-testid="insight-avg-duration">
          <div className="insight-item-header">
            <h4 className="insight-item-title">Average Focus Sprint</h4>
            <span
              className={`evidence-badge ${averageDuration.isSufficient ? 'badge-sufficient' : 'badge-limited'}`}
              data-testid="evidence-badge-duration"
            >
              {averageDuration.isSufficient ? 'Evidence Available' : `Needs ${averageDuration.minimumNeeded} Sessions`}
            </span>
          </div>

          <p className="insight-summary-text" data-testid="avg-duration-summary">
            {averageDuration.summary}
          </p>

          {averageDuration.isSufficient && (
            <div className="duration-stat-box">
              <span className="duration-stat-number" data-testid="avg-duration-value">
                {averageDuration.averageMinutes}
              </span>
              <span className="duration-stat-unit">minutes / completed session</span>
            </div>
          )}
        </div>

        {/* Insight 3: Session Quality Correlation */}
        <div className="insight-card-item" data-testid="insight-session-quality">
          <div className="insight-item-header">
            <h4 className="insight-item-title">Flow Quality Correlation</h4>
            <span
              className={`evidence-badge ${sessionQuality.isSufficient ? 'badge-sufficient' : 'badge-limited'}`}
              data-testid="evidence-badge-quality"
            >
              {sessionQuality.isSufficient ? 'Evidence Available' : `Needs ${sessionQuality.minimumNeeded} Reflections`}
            </span>
          </div>

          <p className="insight-summary-text" data-testid="session-quality-summary">
            {sessionQuality.summary}
          </p>

          {/* Quality Distribution Pills */}
          <div className="quality-distribution-row" data-testid="quality-pills-row">
            <div className="quality-dist-pill pill-productive">
              <span className="dist-icon">🟢</span>
              <span className="dist-text">Productive: {sessionQuality.productiveCount}</span>
            </div>
            <div className="quality-dist-pill pill-distracted">
              <span className="dist-icon">🟡</span>
              <span className="dist-text">Distracted: {sessionQuality.distractedCount}</span>
            </div>
            <div className="quality-dist-pill pill-interrupted">
              <span className="dist-icon">🔴</span>
              <span className="dist-text">Interrupted: {sessionQuality.interruptedCount}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
