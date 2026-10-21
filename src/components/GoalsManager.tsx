import React, { useState } from 'react';
import type { UseGoalsReturn } from '../hooks/useGoals';
import { GoalProgressCard } from './GoalProgressCard';
import { AchievementCard } from './AchievementCard';
import { GoalsModal } from './GoalsModal';
import { getLocalDateString } from '../utils/statsStorage';

interface GoalsManagerProps {
  goalsState: UseGoalsReturn;
}

export const GoalsManager: React.FC<GoalsManagerProps> = ({ goalsState }) => {
  const {
    dailyGoals,
    updateDailyGoals,
    dailyGoalsProgress,
    filteredAchievements,
    unlockedCount,
    totalAchievementsCount,
    filter,
    setFilter,
  } = goalsState;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const todayStr = getLocalDateString();

  return (
    <div className="goals-manager-page" data-testid="goals-manager-page">
      {/* Page Header */}
      <section className="goals-header-card">
        <div className="goals-header-content">
          <div className="goals-header-titles">
            <span className="goals-page-badge">Targets & Milestones</span>
            <h2 className="goals-page-title">Goals & Achievements</h2>
            <p className="goals-page-desc">
              Set intentional daily targets and earn milestones from genuine deep work.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary goals-edit-btn"
            onClick={() => setIsEditModalOpen(true)}
            data-testid="edit-goals-btn"
          >
            Configure Goals
          </button>
        </div>
      </section>

      {/* Daily Goals Section */}
      <section className="daily-goals-section" aria-label="Daily productivity targets">
        <div className="section-header-row">
          <div className="section-title-group">
            <h3 className="section-title">Today's Goals</h3>
            <span className="section-date-badge" data-testid="goals-today-badge">
              {todayStr}
            </span>
          </div>
        </div>

        <div className="daily-goals-grid" data-testid="daily-goals-grid">
          {dailyGoalsProgress.map((item) => (
            <GoalProgressCard
              key={item.id}
              item={item}
              onConfigureClick={() => setIsEditModalOpen(true)}
            />
          ))}
        </div>
      </section>

      {/* Milestones / Achievements Section */}
      <section className="achievements-section" aria-label="Milestones and achievements">
        <div className="section-header-row">
          <div className="section-title-group">
            <h3 className="section-title">Milestones</h3>
            <span className="milestones-count-pill" data-testid="milestones-count-pill">
              {unlockedCount} / {totalAchievementsCount} Unlocked
            </span>
          </div>

          <div
            className="achievement-filter-tabs"
            role="tablist"
            aria-label="Filter achievements"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'all'}
              className={`filter-tab-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
              data-testid="achievement-filter-all"
            >
              All ({totalAchievementsCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'unlocked'}
              className={`filter-tab-btn ${filter === 'unlocked' ? 'active' : ''}`}
              onClick={() => setFilter('unlocked')}
              data-testid="achievement-filter-unlocked"
            >
              Earned ({unlockedCount})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'locked'}
              className={`filter-tab-btn ${filter === 'locked' ? 'active' : ''}`}
              onClick={() => setFilter('locked')}
              data-testid="achievement-filter-locked"
            >
              Locked ({totalAchievementsCount - unlockedCount})
            </button>
          </div>
        </div>

        {filteredAchievements.length === 0 ? (
          <div className="achievements-empty-state" data-testid="achievements-empty-state">
            <div className="empty-icon-circle" aria-hidden="true">
              🏆
            </div>
            <h4 className="empty-title">
              {filter === 'unlocked'
                ? 'No milestones earned yet'
                : 'No milestones found'}
            </h4>
            <p className="empty-desc">
              Complete focus sessions, hit your daily targets, and build habits to earn your
              first milestone!
            </p>
          </div>
        ) : (
          <div className="achievements-grid" data-testid="achievements-grid">
            {filteredAchievements.map((achievement) => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
              />
            ))}
          </div>
        )}
      </section>

      {/* Edit Goals Modal */}
      <GoalsModal
        isOpen={isEditModalOpen}
        currentGoals={dailyGoals}
        onSave={updateDailyGoals}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
};
