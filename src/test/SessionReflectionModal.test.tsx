import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionReflectionModal } from '../components/SessionReflectionModal';
import { saveSessionReflection, loadReflectionsFromStorage } from '../utils/reflectionStorage';

describe('SessionReflectionModal Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not render when isOpen is false', () => {
    render(
      <SessionReflectionModal
        isOpen={false}
        sessionId="session-1"
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    expect(screen.queryByTestId('reflection-modal')).toBeNull();
  });

  it('renders modal with quality options and note input when isOpen is true', () => {
    render(
      <SessionReflectionModal
        isOpen={true}
        sessionId="session-1"
        onSave={vi.fn()}
        onSkip={vi.fn()}
      />
    );

    expect(screen.getByTestId('reflection-modal')).toBeDefined();
    expect(screen.getByText('Session Complete!')).toBeDefined();
    expect(screen.getByTestId('quality-btn-productive')).toBeDefined();
    expect(screen.getByTestId('quality-btn-distracted')).toBeDefined();
    expect(screen.getByTestId('quality-btn-interrupted')).toBeDefined();
    expect(screen.getByTestId('reflection-note-input')).toBeDefined();
    expect(screen.getByTestId('save-reflection-btn')).toBeDefined();
    expect(screen.getByTestId('skip-reflection-btn')).toBeDefined();
  });

  it('allows selecting quality and submitting reflection with note', () => {
    const handleSave = vi.fn();
    const handleSkip = vi.fn();

    render(
      <SessionReflectionModal
        isOpen={true}
        sessionId="session-100"
        onSave={handleSave}
        onSkip={handleSkip}
      />
    );

    // Select "Distracted"
    const distractedRadio = screen.getByTestId('quality-btn-distracted');
    fireEvent.click(distractedRadio);

    // Enter short note
    const noteInput = screen.getByTestId('reflection-note-input');
    fireEvent.change(noteInput, { target: { value: 'Interrupted by Slack pings' } });

    // Submit
    const saveBtn = screen.getByTestId('save-reflection-btn');
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleSave).toHaveBeenCalledWith('session-100', 'distracted', 'Interrupted by Slack pings');
    expect(handleSkip).not.toHaveBeenCalled();
  });

  it('calls onSkip when user chooses to skip reflection', () => {
    const handleSave = vi.fn();
    const handleSkip = vi.fn();

    render(
      <SessionReflectionModal
        isOpen={true}
        sessionId="session-100"
        onSave={handleSave}
        onSkip={handleSkip}
      />
    );

    const skipBtn = screen.getByTestId('skip-reflection-btn');
    fireEvent.click(skipBtn);

    expect(handleSkip).toHaveBeenCalledTimes(1);
    expect(handleSave).not.toHaveBeenCalled();
  });

  it('ensures saving reflection does not duplicate records in storage', () => {
    saveSessionReflection({
      sessionId: 's-repeat',
      completedAt: 1000,
      localDate: '2026-10-20',
      quality: 'productive',
      note: 'Initial note',
    });

    expect(loadReflectionsFromStorage()).toHaveLength(1);

    // Save update with same sessionId
    saveSessionReflection({
      sessionId: 's-repeat',
      completedAt: 1000,
      localDate: '2026-10-20',
      quality: 'distracted',
      note: 'Updated note',
    });

    const records = loadReflectionsFromStorage();
    expect(records).toHaveLength(1);
    expect(records[0].quality).toBe('distracted');
    expect(records[0].note).toBe('Updated note');
  });
});
