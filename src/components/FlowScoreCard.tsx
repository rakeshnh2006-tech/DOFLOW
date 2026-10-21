import React, { useState } from 'react';
import type { FlowScoreBreakdown } from '../types/intelligence';

interface FlowScoreCardProps {
  score: FlowScoreBreakdown;
  todayFocusMinutes: number;
  todaySessions: number;
}

export const FlowScoreCard: React.FC<FlowScoreCardProps> = ({
  score,
  todayFocusMinutes,
  todaySessions,
}) => {
  const [showFormula, setShowFormula] = useState(false);

  // Score tier color & label
  const getScoreTier = (val: number) => {
    if (val >= 85) return { label: 'Optimal Flow', colorClass: 'tier-optimal' };
    if (val >= 60) return { label: 'Solid Momentum', colorClass: 'tier-solid' };
    if (val >= 30) return { label: 'Building Flow', colorClass: 'tier-building' };
    return { label: 'Getting Started', colorClass: 'tier-starting' };
  };

  const tier = getScoreTier(score.totalScore);

  return (
    <section className="intelligence-card flow-score-card" data-testid="flow-score-card">
      <div className="flow-score-header">
        <div className="flow-score-title-group">
          <span className="flow-score-pill">Daily Performance Metric</span>
          <h3 className="flow-score-heading">Today&rsquo;s Flow Score</h3>
          <p className="flow-score-subheading">
            Objective synthesis of focus time, task completion, and session consistency.
          </p>
        </div>
        <button
          type="button"
          className="btn-text-subtle formula-toggle-btn"
          onClick={() => setShowFormula((prev) => !prev)}
          data-testid="toggle-score-formula-btn"
          aria-expanded={showFormula}
        >
          {showFormula ? 'Hide Formula' : 'How is this calculated? ℹ️'}
        </button>
      </div>

      <div className="flow-score-main">
        {/* Left: Score Badge */}
        <div className="flow-score-badge-wrap">
          <div className={`flow-score-circle ${tier.colorClass}`} data-testid="flow-score-circle">
            <span className="flow-score-number" data-testid="flow-score-value">
              {score.totalScore}
            </span>
            <span className="flow-score-max">/ 100</span>
          </div>
          <span className={`flow-score-tier-label ${tier.colorClass}`} data-testid="flow-score-tier">
            {tier.label}
          </span>
        </div>

        {/* Right: Component Breakdowns */}
        <div className="flow-components-list" aria-label="Flow Score components">
          {/* Component 1: Focus Time */}
          <div className="flow-component-item" data-testid="component-focus-time">
            <div className="flow-component-row">
              <span className="flow-component-name">
                <span className="component-dot dot-orange" aria-hidden="true" />
                Focus Time Progress
              </span>
              <span className="flow-component-score" data-testid="flow-score-focus">
                <strong>{score.focusTime.earned}</strong> / {score.focusTime.max} pts
              </span>
            </div>
            <div className="flow-bar-track">
              <div
                className="flow-bar-fill fill-orange"
                style={{ width: `${score.focusTime.percentage}%` }}
              />
            </div>
            <span className="flow-component-desc">{score.focusTime.description}</span>
          </div>

          {/* Component 2: Task Completion */}
          <div className="flow-component-item" data-testid="component-task-completion">
            <div className="flow-component-row">
              <span className="flow-component-name">
                <span className="component-dot dot-emerald" aria-hidden="true" />
                Task Accomplishment
              </span>
              <span className="flow-component-score" data-testid="flow-score-tasks">
                <strong>{score.taskCompletion.earned}</strong> / {score.taskCompletion.max} pts
              </span>
            </div>
            <div className="flow-bar-track">
              <div
                className="flow-bar-fill fill-emerald"
                style={{ width: `${score.taskCompletion.percentage}%` }}
              />
            </div>
            <span className="flow-component-desc">{score.taskCompletion.description}</span>
          </div>

          {/* Component 3: Session Consistency */}
          <div className="flow-component-item" data-testid="component-session-consistency">
            <div className="flow-component-row">
              <span className="flow-component-name">
                <span className="component-dot dot-blue" aria-hidden="true" />
                Session Consistency
              </span>
              <span className="flow-component-score" data-testid="flow-score-consistency">
                <strong>{score.sessionConsistency.earned}</strong> / {score.sessionConsistency.max} pts
              </span>
            </div>
            <div className="flow-bar-track">
              <div
                className="flow-bar-fill fill-blue"
                style={{ width: `${score.sessionConsistency.percentage}%` }}
              />
            </div>
            <span className="flow-component-desc">{score.sessionConsistency.description}</span>
          </div>
        </div>
      </div>

      {/* Transparent Formula Explainer Drawer */}
      {showFormula && (
        <div className="flow-formula-drawer" data-testid="flow-formula-drawer">
          <h4 className="formula-title">Transparent Formula Breakdown</h4>
          <ul className="formula-points">
            <li>
              <strong>Focus Time (40% weight):</strong> Evaluates recorded focus minutes against your daily target (currently {todayFocusMinutes} min logged). Clamped at 40 points.
            </li>
            <li>
              <strong>Task Completion (35% weight):</strong> Evaluates completed tasks against today&rsquo;s planned tasks (or your configured daily task target). Clamped at 35 points.
            </li>
            <li>
              <strong>Session Consistency (25% weight):</strong> Evaluates completed sessions ({todaySessions} today) against your daily target (20 points max) plus up to 5 bonus points for logged &ldquo;Productive&rdquo; reflections.
            </li>
          </ul>
          <p className="formula-disclaimer" data-testid="flow-score-disclaimer">
            {score.disclaimer}
          </p>
        </div>
      )}
    </section>
  );
};
