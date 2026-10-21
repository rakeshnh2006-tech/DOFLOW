import React, { useState } from 'react';
import type { DayBreakdown } from '../types/analytics';

interface WeeklyBarChartProps {
  days: DayBreakdown[];
  activeDate?: string | null;
  onSelectDay?: (date: string) => void;
}

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({
  days,
  activeDate,
  onSelectDay,
}) => {
  const [hoveredDay, setHoveredDay] = useState<DayBreakdown | null>(null);

  // Determine scale maximum (rounded up to nearest multiple of 30 or 60 min, min 60)
  const highestMinutes = Math.max(...days.map((d) => d.focusMinutes), 0);
  const scaleMax = highestMinutes === 0 ? 60 : Math.ceil(highestMinutes / 30) * 30;

  // Active or inspected day (hovered takes precedence, then activeDate prop, else null)
  const inspectedDay =
    hoveredDay || (activeDate ? days.find((d) => d.date === activeDate) || null : null);

  return (
    <div
      className="chart-card"
      role="region"
      aria-label="Weekly focus minutes bar chart"
      data-testid="weekly-bar-chart"
    >
      <div className="chart-header">
        <div className="chart-title-group">
          <h3 className="chart-title">Focus Time Trend</h3>
          <span className="chart-subtitle">Daily focus minutes distribution</span>
        </div>
        {highestMinutes > 0 && (
          <span className="chart-peak-badge" title="Highest daily focus time this period">
            Peak: {highestMinutes}m
          </span>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="chart-visual-wrapper">
        {/* Y-Axis Guide Lines & Labels */}
        <div className="chart-y-axis" aria-hidden="true">
          <div className="y-axis-label">{scaleMax}m</div>
          <div className="y-axis-label">{Math.round(scaleMax / 2)}m</div>
          <div className="y-axis-label">0m</div>
        </div>

        <div className="chart-bars-container">
          {/* Background Grid Lines */}
          <div className="chart-gridlines" aria-hidden="true">
            <div className="gridline gridline-top" />
            <div className="gridline gridline-mid" />
            <div className="gridline gridline-bottom" />
          </div>

          {/* Bar Columns */}
          <div className="chart-bars-row">
            {days.map((day) => {
              const heightPercent =
                day.focusMinutes > 0
                  ? Math.min(100, Math.max(8, Math.round((day.focusMinutes / scaleMax) * 100)))
                  : 0;

              const isSelected = activeDate === day.date;
              const isHovered = hoveredDay?.date === day.date;

              const accessibilityLabel = `${day.dayFullName}, ${day.formattedDate}: ${
                day.focusMinutes
              } focus minutes, ${day.focusSessions} sessions, ${
                day.completedTasks
              } completed tasks.${day.isToday ? ' (Today)' : ''}${
                day.isMostProductive ? ' (Most productive day)' : ''
              }`;

              return (
                <div
                  key={day.date}
                  className={`bar-column ${day.isToday ? 'is-today' : ''} ${
                    day.isMostProductive ? 'is-peak' : ''
                  } ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
                  tabIndex={0}
                  role="button"
                  aria-label={accessibilityLabel}
                  onClick={() => onSelectDay?.(day.date)}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onFocus={() => setHoveredDay(day)}
                  onBlur={() => setHoveredDay(null)}
                  data-testid={`chart-bar-${day.date}`}
                >
                  {/* Top value label */}
                  <div className="bar-value-top" aria-hidden="true">
                    {day.focusMinutes > 0 ? `${day.focusMinutes}m` : '0m'}
                  </div>

                  {/* Vertical Track & Filled Pillar */}
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ height: `${heightPercent}%` }}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Bottom Day Label */}
                  <div className="bar-label-group" aria-hidden="true">
                    <span className="bar-day-name">{day.dayName}</span>
                    <span className="bar-day-num">{day.date.split('-')[2]}</span>
                    {day.isToday && <span className="bar-today-dot" title="Today" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Tooltip / Inspection Detail Bar */}
      <div
        className="chart-inspection-banner"
        data-testid="chart-inspection-banner"
        aria-live="polite"
      >
        {inspectedDay ? (
          <div className="inspection-content">
            <span className="inspection-date">
              <strong>{inspectedDay.dayFullName}</strong>, {inspectedDay.formattedDate}
              {inspectedDay.isToday && <span className="inspection-tag today-tag">Today</span>}
              {inspectedDay.isMostProductive && (
                <span className="inspection-tag star-tag">★ Most Productive</span>
              )}
            </span>
            <div className="inspection-metrics">
              <span className="inspection-metric">
                <span className="metric-dot focus-dot" /> Focus: <strong>{inspectedDay.focusMinutes}m</strong>
              </span>
              <span className="inspection-metric">
                <span className="metric-dot session-dot" /> Sessions: <strong>{inspectedDay.focusSessions}</strong>
              </span>
              <span className="inspection-metric">
                <span className="metric-dot task-dot" /> Tasks: <strong>{inspectedDay.completedTasks}</strong>
              </span>
            </div>
          </div>
        ) : (
          <span className="inspection-placeholder">
            Hover or select any day to inspect sessions, minutes, and task completions.
          </span>
        )}
      </div>
    </div>
  );
};
