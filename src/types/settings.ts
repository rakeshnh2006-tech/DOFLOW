export type ThemeMode = 'light' | 'dark' | 'nordic' | 'forest' | 'sunset';

export interface UserPreferences {
  focusDurationMinutes: number;
  shortBreakDurationMinutes: number;
  longBreakDurationMinutes: number;
  theme: ThemeMode;
  soundEnabled: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  focusDurationMinutes: 25,
  shortBreakDurationMinutes: 5,
  longBreakDurationMinutes: 15,
  theme: 'light',
  soundEnabled: true,
};

export interface SettingsValidationResult {
  isValid: boolean;
  errors: {
    focus?: string;
    shortBreak?: string;
    longBreak?: string;
  };
}

export function validateDurationMinutes(
  value: unknown,
  fieldLabel: string
): string | null {
  if (value === '' || value === null || value === undefined) {
    return `${fieldLabel} duration cannot be empty.`;
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (isNaN(num)) {
    return `${fieldLabel} duration must be a valid number.`;
  }

  if (!Number.isInteger(num)) {
    return `${fieldLabel} duration must be a whole number.`;
  }

  if (num < 1 || num > 120) {
    return `${fieldLabel} duration must be between 1 and 120 minutes.`;
  }

  return null;
}
