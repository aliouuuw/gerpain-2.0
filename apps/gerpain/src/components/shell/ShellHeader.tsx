import { Bell } from 'lucide-react'

import { Avatar } from '#/components/ui/Avatar'
import { IconButton } from '#/components/ui/IconButton'

export function ShellHeader() {
  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">Gerpain</div>
        <span className="header-tagline">Gestion boulangerie</span>
      </div>
      <div className="header-right">
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
  )
}
