import { useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useState } from 'react'

import { Avatar } from '#/components/ui/Avatar'
import { IconButton } from '#/components/ui/IconButton'
import { authClient } from '#/lib/auth-client'
import { memberRoleLabel, userInitials } from '#/lib/member-role'
import { usePermissions } from '#/lib/use-permissions'

export function ShellHeader() {
  const navigate = useNavigate()
  const { data: session, isPending } = authClient.useSession()
  const { memberRole } = usePermissions()
  const [loggingOut, setLoggingOut] = useState(false)

  const user = session?.user
  const displayName = user?.name ?? user?.email ?? '…'
  const initials = user
    ? userInitials(user.name, user.email)
    : '…'

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await authClient.signOut()
      await navigate({ to: '/login' })
    } finally {
      setLoggingOut(false)
    }
  }

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
          <Avatar initials={initials} />
          <div className="user-meta">
            <span className="user-name">
              {isPending ? 'Chargement…' : displayName}
            </span>
            <span className="user-role">{memberRoleLabel(memberRole)}</span>
          </div>
          <button
            type="button"
            className="logout-btn"
            disabled={loggingOut || isPending}
            onClick={() => void handleLogout()}
          >
            {loggingOut ? '…' : 'Déconnexion'}
          </button>
        </div>
      </div>
    </header>
  )
}
