import { Bell } from 'lucide-react';
import { Avatar } from './Avatar';
import { IconButton } from './IconButton';
import { ThemeSwitcher } from './ThemeSwitcher';

export interface HeaderProps {
  themeId: string;
  onThemeChange: (themeId: string) => void;
}

export function Header({ themeId, onThemeChange }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">Gerpain</div>
        <span className="header-tagline">Gestion boulangerie</span>
      </div>
      <div className="header-right">
        <ThemeSwitcher currentThemeId={themeId} onChange={onThemeChange} />
        <IconButton aria-label="Notifications">
          <Bell size={18} />
        </IconButton>
        <div className="user-chip">
          <Avatar initials="AB" />
          <div className="user-meta">
            <span className="user-name">Aminata Ba</span>
            <span className="user-role">Responsable</span>
          </div>
        </div>
      </div>
    </header>
  );
}
