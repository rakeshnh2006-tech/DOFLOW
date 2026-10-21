import React from 'react';

interface TermsConditionsPageProps {
  onBack: () => void;
  onNavigateToPrivacy?: () => void;
}

export const TermsConditionsPage: React.FC<TermsConditionsPageProps> = ({
  onBack,
  onNavigateToPrivacy,
}) => {
  return (
    <div className="legal-page-container" data-testid="terms-conditions-page">
      {/* 1. Page Header & Back Navigation */}
      <div className="legal-header-bar">
        <button
          type="button"
          className="btn-back-link"
          onClick={onBack}
          data-testid="terms-back-btn"
          aria-label="Back to application"
        >
          ← Back to Timer
        </button>
        <div className="legal-header-meta">
          <span className="legal-badge">Legal Terms</span>
          <span className="legal-date-badge" data-testid="terms-last-updated">
            Last Updated: October 20, 2026
          </span>
        </div>
      </div>

      <header className="legal-title-section">
        <h1 className="legal-title">Terms &amp; Conditions</h1>
        <p className="legal-tagline">
          Doflow • Find your flow.
        </p>
        <p className="legal-lead">
          Please read these Terms &amp; Conditions carefully before using the Doflow productivity web application. These terms govern your access to and use of Doflow.
        </p>
      </header>

      {/* 2. Table of Contents */}
      <nav className="legal-toc-card" aria-label="Terms and Conditions Table of Contents">
        <h2 className="toc-title">Table of Contents</h2>
        <ul className="toc-list">
          <li><a href="#terms-1-acceptance">1. Acceptance of Terms</a></li>
          <li><a href="#terms-2-service-desc">2. Service Description &amp; Permitted Use</a></li>
          <li><a href="#terms-3-user-conduct">3. User Responsibilities &amp; Prohibitions</a></li>
          <li><a href="#terms-4-ip-ownership">4. Intellectual Property &amp; Branding</a></li>
          <li><a href="#terms-5-productivity-disclaimer">5. Informational Nature &amp; Productivity Disclaimer</a></li>
          <li><a href="#terms-6-availability">6. Service Availability &amp; Modifications</a></li>
          <li><a href="#terms-7-limitation-liability">7. Limitation of Liability</a></li>
          <li><a href="#terms-8-termination">8. Termination &amp; Data Deletion</a></li>
          <li><a href="#terms-9-changes-terms">9. Updates &amp; Amendments to Terms</a></li>
          <li><a href="#terms-10-governing-law">10. Governing Law &amp; Dispute Resolution</a></li>
          <li><a href="#terms-11-contact">11. Inquiries &amp; Contact</a></li>
        </ul>
      </nav>

      {/* 3. Main Terms Content */}
      <main className="legal-body-content">
        {/* Section 1 */}
        <section id="terms-1-acceptance" className="legal-section">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing, loading, browsing, or interacting with Doflow (&ldquo;Application&rdquo;, &ldquo;Service&rdquo;, or &ldquo;Software&rdquo;), you acknowledge that you have read, understood, and agree to be bound by these Terms &amp; Conditions. If you do not agree to these terms, you should immediately cease using the application and clear your browser storage.
          </p>
        </section>

        {/* Section 2 */}
        <section id="terms-2-service-desc" className="legal-section">
          <h2>2. Service Description &amp; Permitted Use</h2>
          <p>
            Doflow is a client-side self-management productivity software application providing focus timing, task organization, daily planning, habit tracking, focus audio soundscapes, and activity insights.
          </p>
          <p>
            You are granted a non-exclusive, non-transferable, revocable license to access and use Doflow strictly for personal, non-commercial productivity self-management or authorized internal workplace productivity, in compliance with these terms and applicable laws.
          </p>
        </section>

        {/* Section 3 */}
        <section id="terms-3-user-conduct" className="legal-section">
          <h2>3. User Responsibilities &amp; Prohibitions</h2>
          <p>When using Doflow, you agree NOT to:</p>
          <ul>
            <li>Use the software for any unlawful, fraudulent, defamatory, or harmful purpose.</li>
            <li>Attempt to introduce malicious code, cross-site scripts, viruses, or harmful components into the software or its distribution channels.</li>
            <li>Circumvent, disable, or tamper with security features, client-side integrity checks, or storage partitions of the software.</li>
            <li>Misrepresent your identity or claim endorsement or sponsorship by Doflow without explicit written permission.</li>
            <li>Scrape, redistribute, frame, or create unauthorized derivative mirrors intended to deceive or mislead consumers.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section id="terms-4-ip-ownership" className="legal-section">
          <h2>4. Intellectual Property &amp; Branding</h2>
          <p>
            The software architecture, source code, visual design, icons, logos, graphic arrangements, color palettes, and the brand name <strong>&ldquo;Doflow&rdquo;</strong> and tagline <strong>&ldquo;Find your flow.&rdquo;</strong> are the intellectual property of <strong>[Insert Operator Name / Organization]</strong> and are protected by applicable copyright, trademark, and intellectual property laws.
          </p>
          <p>
            <strong>Your Content:</strong> You retain complete and unencumbered ownership of all task titles, planner entries, habit descriptions, notes, and personal reflections you input into the software. Because Doflow stores data 100% locally on your device, the operator claims no rights, licenses, or title to your input content.
          </p>
        </section>

        {/* Section 5 */}
        <section id="terms-5-productivity-disclaimer" className="legal-section">
          <h2>5. Informational Nature &amp; Productivity Disclaimer</h2>
          <div className="legal-callout callout-warning">
            <span className="callout-icon" aria-hidden="true">⚠️</span>
            <div className="callout-content">
              <strong>Health &amp; Performance Disclaimer:</strong> Doflow is an informational self-management tool. It does not provide medical, psychiatric, psychological, diagnostic, or therapeutic advice.
            </div>
          </div>
          <p>
            You acknowledge and agree that:
          </p>
          <ul>
            <li><strong>Flow Score &amp; Analytics:</strong> The Flow Score (0–100), completion statistics, and time-of-day insights are heuristic approximations derived mathematically from your recorded sessions. They are not psychological measurements or diagnostic assessments.</li>
            <li><strong>Duration &amp; Habit Suggestions:</strong> Suggested focus and break intervals are optional references. You are solely responsible for determining your own ergonomic, mental, and physical comfort intervals.</li>
            <li><strong>No Guaranteed Outcomes:</strong> The operator makes no guarantees, promises, or warranties that using Doflow will improve academic performance, employment productivity, or personal well-being.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section id="terms-6-availability" className="legal-section">
          <h2>6. Service Availability &amp; Modifications</h2>
          <p>
            Doflow is provided on an <strong>&ldquo;AS IS&rdquo;</strong> and <strong>&ldquo;AS AVAILABLE&rdquo;</strong> basis without warranties of any kind, whether express, implied, statutory, or otherwise, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
          </p>
          <p>
            The operator reserves the right to update, modify, enhance, or discontinue any feature, soundscape track, formula, or aspect of the software at any time without prior notice or liability.
          </p>
        </section>

        {/* Section 7 */}
        <section id="terms-7-limitation-liability" className="legal-section">
          <h2>7. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by applicable law, in no event shall <strong>[Insert Operator Name / Organization]</strong>, its contributors, affiliates, or licensors be liable for:
          </p>
          <ul>
            <li>Any indirect, incidental, special, consequential, or punitive damages.</li>
            <li>Any loss of profits, revenue, data, goodwill, or business opportunities.</li>
            <li>Any missed deadlines, timer discrepancies resulting from device battery management, browser background tab throttling, or operating system sleep states.</li>
            <li>Any loss of locally stored records resulting from browser cache clearing, device resets, or hardware failure.</li>
          </ul>
          <p>
            Your sole and exclusive remedy for dissatisfaction with the software is to stop using Doflow.
          </p>
        </section>

        {/* Section 8 */}
        <section id="terms-8-termination" className="legal-section">
          <h2>8. Termination &amp; Data Deletion</h2>
          <p>
            Because Doflow operates locally without accounts or server credentials, you may terminate this agreement at any time by ceasing to use the application and clearing your stored browser records via the Privacy Policy page or your browser settings.
          </p>
          <p>
            In the event that future versions introduce optional account-based services, the operator reserves the right to suspend or terminate accounts that breach these terms.
          </p>
        </section>

        {/* Section 9 */}
        <section id="terms-9-changes-terms" className="legal-section">
          <h2>9. Updates &amp; Amendments to Terms</h2>
          <p>
            The operator may revise these Terms &amp; Conditions from time to time. When changes occur, the &ldquo;Last Updated&rdquo; date at the top of this document will be updated. Your continued use of Doflow following the posting of updated terms constitutes your binding acceptance of the revised terms.
          </p>
        </section>

        {/* Section 10 */}
        <section id="terms-10-governing-law" className="legal-section">
          <h2>10. Governing Law &amp; Dispute Resolution</h2>
          <p>
            These Terms &amp; Conditions shall be governed by, construed, and enforced in accordance with the substantive laws of <strong>[Insert Applicable State / Union Territory, India, or Relevant Jurisdiction]</strong>, without regard to its conflict of law principles.
          </p>
          <p>
            Any dispute, controversy, claim, or legal proceeding arising out of or relating to these terms or your use of Doflow shall be subject to the exclusive jurisdiction of the competent courts located in <strong>[Insert Applicable City / Court Jurisdiction, e.g., Bengaluru, Karnataka, India]</strong>.
          </p>
        </section>

        {/* Section 11 */}
        <section id="terms-11-contact" className="legal-section">
          <h2>11. Inquiries &amp; Contact</h2>
          <p>
            For questions, legal notices, or inquiries regarding these Terms &amp; Conditions, please contact:
          </p>
          <div className="operator-details-card">
            <p><strong>Legal Operator / Entity:</strong> [Insert Operator Name / Organization]</p>
            <p><strong>Contact Email:</strong> [Insert Legal Contact Email]</p>
            <p><strong>Official Address:</strong> [Insert Registered Address / Jurisdiction Details]</p>
          </div>
        </section>
      </main>

      {onNavigateToPrivacy && (
        <div className="legal-footer-nav">
          <button
            type="button"
            className="legal-link-btn"
            onClick={onNavigateToPrivacy}
            data-testid="footer-nav-to-privacy"
          >
            ← View Privacy Policy
          </button>
        </div>
      )}
    </div>
  );
};
