import { Link, useRouterState } from '@tanstack/react-router'

import { shellSearchSchema } from '#/lib/shell-date'

const tabs = [
  { to: '/', label: 'Accueil', hint: undefined },
  { to: '/livraisons', label: 'Livraisons', hint: 'Sorties du jour' },
  { to: '/encaissements', label: 'Encaissements', hint: 'Argent reçu' },
  { to: '/stock', label: 'Stock', hint: undefined },
  { to: '/equipe', label: 'Équipe', hint: undefined },
  { to: '/reglages', label: 'Réglages', hint: undefined },
] as const

export function TabNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const rawSearch = useRouterState({ select: (s) => s.location.search })
  const parsed = shellSearchSchema.safeParse(rawSearch)
  const search = parsed.success ? parsed.data : {}

  return (
    <nav className="tab-nav" aria-label="Navigation principale">
      {tabs.map((tab) => {
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
