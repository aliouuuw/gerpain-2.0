import { Link, useRouterState } from '@tanstack/react-router'
import { usePermissions } from '#/lib/use-permissions'
import { shellSearchSchema } from '#/lib/shell-date'

const tabs = [
  { to: '/', label: 'Accueil', hint: undefined, mock: false },
  { to: '/livraisons', label: 'Livraisons', hint: 'Sorties du jour', mock: false },
  { to: '/encaissements', label: 'Encaissements', hint: 'Argent reçu', mock: false },
  { to: '/stock', label: 'Stock', hint: 'Bientôt disponible', mock: true },
  { to: '/equipe', label: 'Équipe', hint: undefined, mock: false },
  { to: '/reglages', label: 'Réglages', hint: undefined, mock: false },
] as const

export function TabNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const rawSearch = useRouterState({ select: (s) => s.location.search })
  const parsed = shellSearchSchema.safeParse(rawSearch)
  const search = parsed.success ? parsed.data : {}
  const { canManageCollections } = usePermissions()

  const visibleTabs = [
    ...tabs.filter((tab) => !tab.mock),
    ...(canManageCollections
      ? [
          {
            to: '/reconciliations' as const,
            label: 'Réconciliations',
            hint: 'Clôture paie par agent',
            mock: false,
          },
        ]
      : []),
  ]

  return (
    <nav className="tab-nav" aria-label="Navigation principale">
      {visibleTabs.map((tab) => {
        const isActive =
          tab.to === '/' ? pathname === '/' : pathname.startsWith(tab.to)

        return (
          <Link
            key={tab.to}
            to={tab.to}
            search={search}
            className={`tab-nav-item ${isActive ? 'active' : ''}`}
            title={tab.hint}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
