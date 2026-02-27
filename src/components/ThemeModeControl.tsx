import type { ThemePreference } from '../theme/useThemePreference';

interface ThemeModeControlProps {
  preference: ThemePreference;
  onPreferenceChange: (preference: ThemePreference) => void;
}

const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

const toLabel = (option: ThemePreference): string => {
  if (option === 'system') {
    return 'System';
  }

  if (option === 'light') {
    return 'Light';
  }

  return 'Dark';
};

const getNextOption = (preference: ThemePreference, key: string): ThemePreference | null => {
  const currentIndex = THEME_OPTIONS.indexOf(preference);
  const lastIndex = THEME_OPTIONS.length - 1;

  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return THEME_OPTIONS[currentIndex >= lastIndex ? 0 : currentIndex + 1];
  }

  if (key === 'ArrowLeft' || key === 'ArrowUp') {
    return THEME_OPTIONS[currentIndex <= 0 ? lastIndex : currentIndex - 1];
  }

  if (key === 'Home') {
    return THEME_OPTIONS[0];
  }

  if (key === 'End') {
    return THEME_OPTIONS[lastIndex];
  }

  return null;
};

export const ThemeModeControl = ({ preference, onPreferenceChange }: ThemeModeControlProps): JSX.Element => (
  <div className="theme-mode-control field">
    <span id="theme-mode-label">Theme mode</span>
    <div className="theme-segmented" role="radiogroup" aria-labelledby="theme-mode-label">
      {THEME_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={preference === option}
          className={`theme-option ${preference === option ? 'theme-option-active' : ''}`}
          onKeyDown={(event) => {
            const nextOption = getNextOption(preference, event.key);
            if (nextOption === null) {
              return;
            }

            event.preventDefault();
            onPreferenceChange(nextOption);
          }}
          onClick={() => onPreferenceChange(option)}
        >
          {toLabel(option)}
        </button>
      ))}
    </div>
  </div>
);
