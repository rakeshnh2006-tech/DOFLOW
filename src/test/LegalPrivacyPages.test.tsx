import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { TASKS_STORAGE_KEY } from '../utils/taskStorage';
import { SESSION_HISTORY_STORAGE_KEY } from '../utils/statsStorage';
import { HABITS_STORAGE_KEY } from '../utils/habitStorage';
import { PLANNER_STORAGE_KEY } from '../utils/plannerStorage';

describe('Legal & Privacy Pages Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Navigation & Accessibility', () => {
    it('navigates to Privacy Policy via footer link and returns to Timer', () => {
      render(<App />);

      // Initial view is timer
      expect(screen.getByTestId('timer-card')).toBeDefined();

      // Click footer link
      const privacyLink = screen.getByTestId('footer-privacy-link');
      expect(privacyLink).toBeDefined();
      fireEvent.click(privacyLink);

      // Privacy Policy page is displayed
      const privacyPage = screen.getByTestId('privacy-policy-page');
      expect(privacyPage).toBeDefined();
      expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeDefined();

      // Click back button
      const backBtn = screen.getByTestId('privacy-back-btn');
      fireEvent.click(backBtn);

      // Back on timer view
      expect(screen.getByTestId('timer-card')).toBeDefined();
    });

    it('navigates to Terms & Conditions via footer link and returns to Timer', () => {
      render(<App />);

      const termsLink = screen.getByTestId('footer-terms-link');
      expect(termsLink).toBeDefined();
      fireEvent.click(termsLink);

      const termsPage = screen.getByTestId('terms-conditions-page');
      expect(termsPage).toBeDefined();
      expect(screen.getByRole('heading', { level: 1, name: /Terms & Conditions/i })).toBeDefined();

      const backBtn = screen.getByTestId('terms-back-btn');
      fireEvent.click(backBtn);

      expect(screen.getByTestId('timer-card')).toBeDefined();
    });

    it('navigates to Privacy Policy and Terms from Settings modal', () => {
      render(<App />);

      // Open settings modal
      const settingsBtn = screen.getByTestId('settings-button');
      fireEvent.click(settingsBtn);

      expect(screen.getByTestId('settings-modal')).toBeDefined();

      // Click Privacy Policy in settings
      const settingsPrivacyLink = screen.getByTestId('settings-privacy-link');
      fireEvent.click(settingsPrivacyLink);

      // Settings modal closes and Privacy Policy page is shown
      expect(screen.queryByTestId('settings-modal')).toBeNull();
      expect(screen.getByTestId('privacy-policy-page')).toBeDefined();

      // Return to timer
      fireEvent.click(screen.getByTestId('privacy-back-btn'));

      // Open settings again and click Terms & Conditions
      fireEvent.click(screen.getByTestId('settings-button'));
      const settingsTermsLink = screen.getByTestId('settings-terms-link');
      fireEvent.click(settingsTermsLink);

      expect(screen.queryByTestId('settings-modal')).toBeNull();
      expect(screen.getByTestId('terms-conditions-page')).toBeDefined();
    });

    it('navigates between Terms & Conditions and Privacy Policy via footer cross-links', () => {
      render(<App />);

      // Navigate to Terms
      fireEvent.click(screen.getByTestId('footer-terms-link'));
      expect(screen.getByTestId('terms-conditions-page')).toBeDefined();

      // Cross-navigate to Privacy Policy
      const crossLinkToPrivacy = screen.getByTestId('footer-nav-to-privacy');
      fireEvent.click(crossLinkToPrivacy);
      expect(screen.getByTestId('privacy-policy-page')).toBeDefined();

      // Cross-navigate back to Terms
      const crossLinkToTerms = screen.getByTestId('footer-nav-to-terms');
      fireEvent.click(crossLinkToTerms);
      expect(screen.getByTestId('terms-conditions-page')).toBeDefined();
    });
  });

  describe('Privacy Policy Accuracy and Disclosures', () => {
    it('discloses all real client-side storage keys, zero server transmission, and security limitations', () => {
      render(<App />);
      fireEvent.click(screen.getByTestId('footer-privacy-link'));

      // 1. Core disclosure of what Doflow does
      expect(screen.getByText(/minimal productivity web application designed to help individuals focus/i)).toBeDefined();

      // 2. Client-side local storage disclosure
      expect(screen.getByText(/Zero Remote Server Transmission:/i)).toBeDefined();
      expect(screen.getByText(/Doflow does not operate any remote database/i)).toBeDefined();

      // 3. Storage key table shows actual keys
      expect(screen.getByText('doflow_tasks_v1')).toBeDefined();
      expect(screen.getByText('doflow_active_task_id_v1')).toBeDefined();
      expect(screen.getByText('doflow_session_history_v1')).toBeDefined();
      expect(screen.getByText('doflow_soundscape_preferences_v1')).toBeDefined();
      expect(screen.getByText('doflow_habits_v1')).toBeDefined();
      expect(screen.getByText('doflow_habit_completions_v1')).toBeDefined();
      expect(screen.getByText('doflow_session_reflections_v1')).toBeDefined();

      // 4. Zero analytics, advertising, or external AI disclosure
      expect(screen.getByText(/No HTTP Cookies:/i)).toBeDefined();
      expect(screen.getByText(/No Analytics SDKs:/i)).toBeDefined();
      expect(screen.getByText(/No External AI APIs:/i)).toBeDefined();
      expect(screen.getByText(/Deterministic Client-Side Calculations:/i)).toBeDefined();

      // 5. Security limitations of browser localStorage
      expect(screen.getByRole('heading', { level: 2, name: /Security Limitations of Local Storage/i })).toBeDefined();
      expect(screen.getByText(/is stored in unencrypted plain text/i)).toBeDefined();

      // 6. Children's privacy & Indian DPDPA 2023
      expect(screen.getByRole('heading', { level: 2, name: /Children’s Privacy/i })).toBeDefined();
      expect(screen.getByText(/Digital Personal Data Protection Act, 2023/i)).toBeDefined();

      // 7. Placeholders for missing operator details
      expect(screen.getAllByText(/\[Insert Operator Name \/ Organization\]/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/\[Insert Privacy Contact Email\]/i).length).toBeGreaterThan(0);
    });
  });

  describe('Terms & Conditions Accuracy and Disclosures', () => {
    it('discloses acceptance, IP rights, non-medical nature of scores, and governing law placeholders', () => {
      render(<App />);
      fireEvent.click(screen.getByTestId('footer-terms-link'));

      // 1. Acceptance and permitted use
      expect(screen.getByRole('heading', { level: 2, name: /Acceptance of Terms/i })).toBeDefined();
      expect(screen.getByText(/strictly for personal, non-commercial productivity self-management/i)).toBeDefined();

      // 2. Intellectual property ("Doflow" and "Find your flow.")
      expect(screen.getByRole('heading', { level: 2, name: /Intellectual Property & Branding/i })).toBeDefined();
      expect(screen.getAllByText(/Find your flow\./i).length).toBeGreaterThan(0);

      // 3. Disclaimers for productivity score and soundscapes
      expect(screen.getByText(/Health & Performance Disclaimer:/i)).toBeDefined();
      expect(screen.getByText(/Flow Score \(0–100\), completion statistics, and time-of-day insights are heuristic approximations/i)).toBeDefined();

      // 4. Limitations of liability
      expect(screen.getByRole('heading', { level: 2, name: /Limitation of Liability/i })).toBeDefined();

      // 5. Governing law and placeholders
      expect(screen.getByRole('heading', { level: 2, name: /Governing Law & Dispute Resolution/i })).toBeDefined();
      expect(screen.getAllByText(/\[Insert Applicable State \/ Union Territory, India, or Relevant Jurisdiction\]/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/\[Insert Applicable City \/ Court Jurisdiction, e.g., Bengaluru, Karnataka, India\]/i).length).toBeGreaterThan(0);
    });
  });

  describe('Data Footprint and Confirmation Deletion Flow', () => {
    it('displays local data footprint without erasing data on view', () => {
      // Seed some data
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([{ id: 't1', title: 'Task 1', completed: false, createdAt: Date.now() }]));
      localStorage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify([{ id: 's1', mode: 'focus', durationMs: 1500000, completedAt: Date.now(), localDate: '2026-10-20' }]));
      localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify([{ id: 'h1', title: 'Drink water', scheduleType: 'daily', selectedDays: [], createdAt: Date.now(), archived: false }]));
      localStorage.setItem('other_origin_key', 'should not be deleted');

      render(<App />);
      fireEvent.click(screen.getByTestId('footer-privacy-link'));

      // Data is still in localStorage
      expect(localStorage.getItem(TASKS_STORAGE_KEY)).not.toBeNull();
      expect(localStorage.getItem(SESSION_HISTORY_STORAGE_KEY)).not.toBeNull();
      expect(localStorage.getItem(HABITS_STORAGE_KEY)).not.toBeNull();

      // Footprint card shows active keys count
      const footprintCard = screen.getByTestId('data-footprint-card');
      expect(footprintCard).toBeDefined();
      const badge = screen.getByTestId('active-keys-badge');
      expect(badge.textContent).toMatch(/[3-9] of 11 Categories Active/);
    });

    it('requires explicit confirmation before clearing data and can be cancelled', () => {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([{ id: 't1', title: 'Task 1', completed: false, createdAt: Date.now() }]));

      render(<App />);
      fireEvent.click(screen.getByTestId('footer-privacy-link'));

      // Open clear data modal
      const openModalBtn = screen.getByTestId('clear-all-data-btn');
      fireEvent.click(openModalBtn);

      // Modal is visible
      const modal = screen.getByTestId('clear-data-confirmation-modal');
      expect(modal).toBeDefined();

      // Cancel button closes modal without deleting data
      const cancelBtn = screen.getByTestId('cancel-clear-data-btn');
      fireEvent.click(cancelBtn);

      expect(screen.queryByTestId('clear-data-confirmation-modal')).toBeNull();
      expect(localStorage.getItem(TASKS_STORAGE_KEY)).not.toBeNull();
    });

    it('erases all Doflow data upon confirmation while preserving non-Doflow origin storage', () => {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([{ id: 't1', title: 'Task 1', completed: false, createdAt: Date.now() }]));
      localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify([{ id: 'p1', title: 'Planned 1', priority: 'high', completed: false, createdAt: Date.now() }]));
      localStorage.setItem('unrelated_origin_data', 'keep_me_safe');

      render(<App />);
      fireEvent.click(screen.getByTestId('footer-privacy-link'));

      // Open modal and confirm
      fireEvent.click(screen.getByTestId('clear-all-data-btn'));
      const confirmBtn = screen.getByTestId('confirm-clear-data-btn');
      fireEvent.click(confirmBtn);

      // Success banner shown
      expect(screen.getByTestId('clear-success-banner')).toBeDefined();
      expect(screen.getByText(/All local Doflow records have been permanently cleared from this browser/i)).toBeDefined();

      // Doflow keys removed
      expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(PLANNER_STORAGE_KEY)).toBeNull();

      // Non-Doflow origin key is preserved
      expect(localStorage.getItem('unrelated_origin_data')).toBe('keep_me_safe');

      // Footprint badge is now 0 of 11
      const badge = screen.getByTestId('active-keys-badge');
      expect(badge.textContent).toContain('0 of 11 Categories Active');
    });
  });
});
