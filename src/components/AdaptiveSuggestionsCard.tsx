import React from 'react';
import type { AdaptiveDurationSuggestion } from '../types/intelligence';

interface AdaptiveSuggestionsCardProps {
  suggestion: AdaptiveDurationSuggestion;
  currentFocusMinutes: number;
  currentShortBreakMinutes: number;
  onApply: () => void;
}

export const AdaptiveSuggestionsCard: React.FC<AdaptiveSuggestionsCardProps> = ({
  suggestion,
  currentFocusMinutes,
  currentShortBreakMinutes,
  onApply,
}) => {
  const isCurrentlyApplied = !suggestion.isDifferentFromCurrent;

  return (
    <section className="intelligence-card adaptive-suggestions-card" data-testid="adaptive-suggestions-card">
      <div className="intelligence-card-header">
        <div>
          <span className="intelligence-badge">Adaptive Engine</span>
          <h3 className="intelligence-card-title">Suggested Focus &amp; Break Durations</h3>
          <p className="intelligence-card-subtitle">
            Explainable duration recommendations tailored to your completion patterns and reflections.
          </p>
        </div>

        <span
          className={`evidence-badge ${
            suggestion.evidenceLevel === 'sufficient' ? 'badge-sufficient' : 'badge-limited'
          }`}
          data-testid="evidence-badge-suggestion"
        >
          {suggestion.evidenceLevel === 'sufficient' ? 'Evidence-Based' : 'Initial Baseline'}
        </span>
      </div>

      <div className="suggestion-body">
        {/* Suggested Durations Comparison */}
        <div className="durations-comparison-grid">
          <div className="duration-card-item duration-suggested" data-testid="duration-suggested-box">
            <span className="duration-card-label">Recommended Sprint</span>
            <div className="duration-numbers-row">
              <span className="duration-big-number" data-testid="suggested-focus-mins">
                {suggestion.focusDurationMinutes}
              </span>
              <span className="duration-unit">min focus</span>
              <span className="duration-plus">+</span>
              <span className="duration-big-number" data-testid="suggested-break-mins">
                {suggestion.shortBreakDurationMinutes}
              </span>
              <span className="duration-unit">min break</span>
            </div>
          </div>

          <div className="duration-card-item duration-current">
            <span className="duration-card-label">Your Current Settings</span>
            <div className="duration-numbers-row">
              <span className="duration-dim-number" data-testid="current-focus-mins">
                {currentFocusMinutes}m
              </span>
              <span className="duration-unit">focus</span>
              <span className="duration-plus">+</span>
              <span className="duration-dim-number" data-testid="current-break-mins">
                {currentShortBreakMinutes}m
              </span>
              <span className="duration-unit">break</span>
            </div>
          </div>
        </div>

        {/* Reason Explanation */}
        <p className="suggestion-reason-text" data-testid="suggestion-reason">
          <span className="reason-icon" aria-hidden="true">
            📋
          </span>{' '}
          {suggestion.reason}
        </p>

        {/* Action Button */}
        <div className="suggestion-action-row">
          {isCurrentlyApplied ? (
            <div className="already-applied-pill" data-testid="suggestions-already-applied">
              ✓ Matches your current preferences
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onApply}
              data-testid="apply-suggestions-btn"
            >
              Apply Suggested Durations ({suggestion.focusDurationMinutes}m / {suggestion.shortBreakDurationMinutes}m)
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
