import React, { useState } from 'react';
import { ClearDataModal } from './ClearDataModal';
import { inspectStoredDataFootprint } from '../utils/dataManagement';

interface PrivacyPolicyPageProps {
  onBack: () => void;
  onClearAllData: () => void;
  onNavigateToTerms?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({
  onBack,
  onClearAllData,
  onNavigateToTerms,
}) => {
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearSuccessMessage, setClearSuccessMessage] = useState(false);
  const dataSummary = inspectStoredDataFootprint();

  const handleConfirmClear = () => {
    onClearAllData();
    setIsClearModalOpen(false);
    setClearSuccessMessage(true);
  };

  return (
    <div className="legal-page-container" data-testid="privacy-policy-page">
      {/* 1. Page Header & Back Navigation */}
      <div className="legal-header-bar">
        <button
          type="button"
          className="btn-back-link"
          onClick={onBack}
          data-testid="privacy-back-btn"
          aria-label="Back to application"
        >
          ← Back to Timer
        </button>
        <div className="legal-header-meta">
          <span className="legal-badge">Official Notice</span>
          <span className="legal-date-badge" data-testid="privacy-last-updated">
            Last Updated: October 20, 2026
          </span>
        </div>
      </div>

      <header className="legal-title-section">
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-tagline">
          Doflow • Find your flow.
        </p>
        <p className="legal-lead">
          This Privacy Policy provides a transparent, factual description of how the Doflow productivity application handles your information. Doflow is engineered with a strict local-first, privacy-by-design architecture: your data stays on your device.
        </p>
      </header>

      {/* 2. Table of Contents */}
      <nav className="legal-toc-card" aria-label="Privacy Policy Table of Contents">
        <h2 className="toc-title">Table of Contents</h2>
        <ul className="toc-list">
          <li><a href="#section-1-overview">1. What Doflow Does</a></li>
          <li><a href="#section-2-data-stored">2. What Information Is Stored Locally</a></li>
          <li><a href="#section-3-local-vs-remote">3. Local Storage vs. Remote Transmission</a></li>
          <li><a href="#section-4-trackers-cookies">4. Cookies, Analytics &amp; Advertising</a></li>
          <li><a href="#section-5-ai-services">5. Artificial Intelligence &amp; Heuristics</a></li>
          <li><a href="#section-6-security-limits">6. Security Limitations of Local Storage</a></li>
          <li><a href="#section-7-children-privacy">7. Children&rsquo;s Privacy (DPDPA &amp; International)</a></li>
          <li><a href="#section-8-data-management">8. Managing &amp; Clearing Your Data</a></li>
          <li><a href="#section-9-policy-updates">9. Updates to This Policy</a></li>
          <li><a href="#section-10-contact">10. Operator Contact Information</a></li>
        </ul>
      </nav>

      {/* 3. Policy Body Sections */}
      <main className="legal-body-content">
        {/* Section 1 */}
        <section id="section-1-overview" className="legal-section">
          <h2>1. What Doflow Does</h2>
          <p>
            Doflow is a minimal productivity web application designed to help individuals focus on deep work and track personal daily progress. Features include:
          </p>
          <ul>
            <li><strong>Pomodoro Focus Timer:</strong> Wall-clock countdown tracking for focus, short-break, and long-break sessions.</li>
            <li><strong>Task Management:</strong> Task creation, active goal selection, completion tracking, and deletion.</li>
            <li><strong>Daily Planner:</strong> Chronological scheduling with priority indicators, start times, and deadlines.</li>
            <li><strong>Weekly Analytics:</strong> Visual distribution of recorded focus minutes, completed sessions, and daily streaks.</li>
            <li><strong>Focus Soundscape:</strong> In-browser synthesized and locally bundled ambient background audio.</li>
            <li><strong>Habits &amp; Streaks:</strong> Recurring schedule habit tracking with non-breaking schedule rules.</li>
            <li><strong>Goals &amp; Milestones:</strong> User-configured daily focus targets and activity-earned milestones.</li>
            <li><strong>Flow Intelligence:</strong> Objective, transparent daily Flow Score (0–100), task recommendations, post-session reflections, and evidence-based duration suggestions.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section id="section-2-data-stored" className="legal-section">
          <h2>2. What Information Is Stored Locally</h2>
          <p>
            When you use Doflow, the application stores information directly in your web browser&rsquo;s <code>localStorage</code>. Doflow categorizes stored information as follows:
          </p>
          <div className="legal-table-wrap">
            <table className="legal-data-table" aria-label="Table of stored data categories">
              <thead>
                <tr>
                  <th scope="col">Data Category</th>
                  <th scope="col">Storage Key</th>
                  <th scope="col">Description &amp; Attributes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Tasks &amp; Active Goal</strong></td>
                  <td><code>doflow_tasks_v1</code>, <code>doflow_active_task_id_v1</code></td>
                  <td>User-entered task titles, boolean completion states, creation timestamps, and active goal reference.</td>
                </tr>
                <tr>
                  <td><strong>Daily Planner</strong></td>
                  <td><code>doflow_planner_tasks_v1</code></td>
                  <td>Scheduled task entries, calendar date, priority levels (Low, Medium, High), start time, deadline, and top-priority flags.</td>
                </tr>
                <tr>
                  <td><strong>Focus Session History</strong></td>
                  <td><code>doflow_session_history_v1</code></td>
                  <td>Completed session identifiers, timer mode (focus, short break, long break), duration in milliseconds, local calendar date, and completion timestamp.</td>
                </tr>
                <tr>
                  <td><strong>Session Reflections</strong></td>
                  <td><code>doflow_session_reflections_v1</code></td>
                  <td>User-reported focus quality (Productive, Distracted, Interrupted), optional short reflection note, session ID, and timestamp.</td>
                </tr>
                <tr>
                  <td><strong>Preferences &amp; Settings</strong></td>
                  <td><code>doflow_user_preferences_v1</code></td>
                  <td>Configured focus and break durations (1–120 min), theme preference (Light or Dark), and completion chime audio toggle.</td>
                </tr>
                <tr>
                  <td><strong>Soundscape Audio Settings</strong></td>
                  <td><code>doflow_soundscape_preferences_v1</code></td>
                  <td>Individual ambient sound track volumes, master volume, and soundscape enabled toggle.</td>
                </tr>
                <tr>
                  <td><strong>Habits &amp; Streaks</strong></td>
                  <td><code>doflow_habits_v1</code>, <code>doflow_habit_completions_v1</code></td>
                  <td>Habit names, descriptions, weekly day schedules, archive status, and local calendar date completion records.</td>
                </tr>
                <tr>
                  <td><strong>Daily Goals &amp; Milestones</strong></td>
                  <td><code>doflow_daily_goals_v1</code>, <code>doflow_achievements_v1</code></td>
                  <td>Target focus minutes, target sessions, target tasks, and unlocked milestone records with unlock timestamps.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 */}
        <section id="section-3-local-vs-remote" className="legal-section">
          <h2>3. Local Storage vs. Remote Transmission</h2>
          <div className="legal-callout callout-info">
            <span className="callout-icon" aria-hidden="true">🔒</span>
            <div className="callout-content">
              <strong>Zero Remote Server Transmission:</strong> Doflow does not operate any remote database, cloud storage bucket, synchronization server, or user authentication system.
            </div>
          </div>
          <p>
            All information generated during your use of Doflow is stored exclusively in your web browser&rsquo;s <code>localStorage</code> under the domain origin hosting the application.
          </p>
          <ul>
            <li>No data is transmitted over the internet to the application creator, maintainers, or third parties.</li>
            <li>No user accounts, passwords, email addresses, or phone numbers are requested or stored.</li>
            <li>Once loaded in your browser, the application functions entirely offline.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="section-4-trackers-cookies" className="legal-section">
          <h2>4. Cookies, Analytics &amp; Advertising</h2>
          <p>
            Doflow strictly avoids tracking and telemetry technologies:
          </p>
          <ul>
            <li><strong>No HTTP Cookies:</strong> Doflow does not set or read any HTTP cookies (<code>document.cookie</code> is not utilized).</li>
            <li><strong>No Analytics SDKs:</strong> Doflow does not bundle Google Analytics, Mixpanel, Segment, Sentry, or any third-party behavioral telemetry script.</li>
            <li><strong>No Web Beacons or Tracking Pixels:</strong> There are no tracking pixels or invisible tracking beacons embedded in the application.</li>
            <li><strong>No Commercial Advertising:</strong> Doflow does not display advertisements, integrate ad networks, or share user behavior with data brokers.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section id="section-5-ai-services" className="legal-section">
          <h2>5. Artificial Intelligence &amp; Heuristics</h2>
          <p>
            The <strong>Doflow Flow Intelligence</strong> feature provides a daily Flow Score (0–100), task rankings, productivity patterns, and adaptive duration recommendations:
          </p>
          <ul>
            <li><strong>Deterministic Client-Side Calculations:</strong> All scores, rankings, insights, and recommendations are computed entirely within your local browser using pure, transparent mathematical formulas.</li>
            <li><strong>No External AI APIs:</strong> Doflow does not transmit your tasks, notes, or activity to OpenAI, Google Gemini, Anthropic, or any third-party cloud machine learning service.</li>
            <li><strong>No Automated Profiling:</strong> Doflow does not profile you, infer sensitive personal traits, or make legal or psychological judgments. All formulas are documented and viewable directly within the application.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section id="section-6-security-limits" className="legal-section">
          <h2>6. Security Limitations of Local Storage</h2>
          <div className="legal-callout callout-warning">
            <span className="callout-icon" aria-hidden="true">⚠️</span>
            <div className="callout-content">
              <strong>Storage Security Disclosure:</strong> Web browser <code>localStorage</code> is stored in unencrypted plain text within your local operating system user profile.
            </div>
          </div>
          <p>
            Users should be aware of the inherent technical constraints of browser-based storage:
          </p>
          <ul>
            <li><strong>Physical Device Access:</strong> Anyone with administrative or physical access to your unlocked computer or mobile device can inspect the browser profile directory or browser Developer Tools.</li>
            <li><strong>Browser Extensions:</strong> Untrusted third-party browser extensions with permissions to read website storage or DOM contents could theoretically inspect data stored in <code>localStorage</code>.</li>
            <li><strong>Shared &amp; Public Computers:</strong> If you use Doflow on a public library computer, shared workstation, or untrusted device, you should use Private/Incognito browsing or manually clear your data using the controls below before closing the browser.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section id="section-7-children-privacy" className="legal-section">
          <h2>7. Children&rsquo;s Privacy (DPDPA &amp; International)</h2>
          <p>
            Doflow is designed as a general productivity tool and is not intended to solicit personal data from children under the age of 18 (under India&rsquo;s Digital Personal Data Protection Act, 2023) or under 13 (under the United States Children&rsquo;s Online Privacy Protection Act - COPPA).
          </p>
          <p>
            Because Doflow does not collect personal data on any server or transmit data across the internet, no identifiable personal data of any child or adult is gathered, processed, or transferred by the software provider.
          </p>
        </section>

        {/* Section 8: Interactive Data Management Section */}
        <section id="section-8-data-management" className="legal-section data-management-section">
          <h2>8. Managing &amp; Clearing Your Data</h2>
          <p>
            You retain absolute sovereignty over your Doflow data. You can inspect your active local storage footprint below and delete all stored records at any time.
          </p>

          <div className="data-footprint-card" data-testid="data-footprint-card">
            <div className="footprint-header">
              <h3 className="footprint-title">Your Current Storage Footprint</h3>
              <span className="footprint-badge" data-testid="active-keys-badge">
                {dataSummary.activeKeysCount} of {dataSummary.totalDoflowKeys} Categories Active
              </span>
            </div>
            <p className="footprint-sub">
              Estimated local browser footprint: ~{Math.round(dataSummary.estimatedSizeBytes / 1024)} KB
            </p>

            <div className="footprint-grid" data-testid="footprint-grid">
              {dataSummary.categories.map((cat) => (
                <div key={cat.key} className={`footprint-item ${cat.hasData ? 'active' : 'empty'}`}>
                  <span className="footprint-dot" aria-hidden="true" />
                  <div className="footprint-info">
                    <span className="footprint-label">{cat.label}</span>
                    <span className="footprint-count">
                      {cat.hasData ? `${cat.itemCount} ${cat.itemCount === 1 ? 'record' : 'records'}` : 'Empty'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="footprint-actions">
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setIsClearModalOpen(true)}
                data-testid="clear-all-data-btn"
              >
                Clear All Stored Doflow Data
              </button>
              <p className="footprint-action-note">
                Requires explicit confirmation in the next step. Merely viewing this page does not alter any stored records.
              </p>
            </div>

            {clearSuccessMessage && (
              <div className="clear-success-banner" data-testid="clear-success-banner" role="status">
                <span className="success-icon" aria-hidden="true">✓</span>
                <span>All local Doflow records have been permanently cleared from this browser. Default settings restored.</span>
              </div>
            )}
          </div>
        </section>

        {/* Section 9 */}
        <section id="section-9-policy-updates" className="legal-section">
          <h2>9. Updates to This Policy</h2>
          <p>
            If Doflow introduces architectural changes—such as optional cloud synchronization, cross-device backups, or new local storage categories—this Privacy Policy will be updated accordingly with a revised &ldquo;Last Updated&rdquo; date. Any changes will continue to adhere to strict transparency regarding actual software implementation.
          </p>
        </section>

        {/* Section 10 */}
        <section id="section-10-contact" className="legal-section">
          <h2>10. Operator Contact Information</h2>
          <p>
            If you have questions, feedback, or inquiries regarding this Privacy Policy or Doflow&rsquo;s data-handling practices, you may reach out using the following details:
          </p>
          <div className="operator-details-card">
            <p><strong>Software:</strong> Doflow Focus &amp; Productivity Application</p>
            <p><strong>Legal Operator / Maintainer:</strong> [Insert Operator Name / Organization]</p>
            <p><strong>Privacy Contact Email:</strong> [Insert Privacy Contact Email]</p>
            <p><strong>Jurisdiction / Location:</strong> [Insert Applicable State / Union Territory, India, or Relevant Jurisdiction]</p>
          </div>
          <p className="legal-disclaimer-note">
            <em>Disclaimer: This document accurately reflects the technical data practices of the Doflow software. It is provided for informational and transparency purposes and does not constitute formal legal counsel.</em>
          </p>
        </section>
      </main>

      {onNavigateToTerms && (
        <div className="legal-footer-nav">
          <button
            type="button"
            className="legal-link-btn"
            onClick={onNavigateToTerms}
            data-testid="footer-nav-to-terms"
          >
            View Terms &amp; Conditions →
          </button>
        </div>
      )}

      {/* Confirmation Modal for Data Clearing */}
      <ClearDataModal
        isOpen={isClearModalOpen}
        onConfirm={handleConfirmClear}
        onClose={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};
