import { themes } from '../themes';

export interface ThemeSwitcherProps {
  currentThemeId: string;
  onChange: (themeId: string) => void;
}

export function ThemeSwitcher({ currentThemeId, onChange }: ThemeSwitcherProps) {
  return (
    <div className="theme-switcher">
      <span className="theme-switcher-label">Thème</span>
      <div className="theme-switcher-options">
        {themes.map((theme) => (
          <button
            key={theme.id}
            type="button"
            className={`theme-switcher-btn ${theme.id === currentThemeId ? 'active' : ''}`}
            aria-label={theme.label}
            title={theme.label}
            onClick={() => onChange(theme.id)}
          >
            <span className={`theme-swatch theme-swatch-${theme.id}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
