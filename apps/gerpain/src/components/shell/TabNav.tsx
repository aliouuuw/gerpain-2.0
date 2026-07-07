import { Link, useRouterState } from '@tanstack/react-router'
import { usePermissions } from '#/lib/use-permissions'
import { shellSearchSchema } from '#/lib/shell-date'

const tabs = [
  { to: '/', label: 'Accueil', hint: undefined, mock: false, managerOnly: false },
  {
    to: '/livraisons',
    label: 'Livraisons',
    hint: 'Sorties du jour',
    mock: false,
    managerOnly: false,
  },
  {
    to: '/encaissements',
    label: 'Encaissements',
    hint: 'Argent reçu',
    mock: false,
    managerOnly: false,
  },
  {
    to: '/reconciliations',
    label: 'Réconciliations',
    hint: 'Clôture paie par agent',
    mock: false,
    managerOnly: true,
  },
  { to: '/stock', label: 'Stock', hint: 'Bientôt disponible', mock: true, managerOnly: false },
  {
    to: '/equipe/annuaire',
    label: 'Équipe',
    hint: 'Personnel & paie',
    mock: false,
    managerOnly: false,
    activePrefix: '/equipe',
  },
  {
    to: '/reglages/boulangerie',
    label: 'Réglages',
    hint: undefined,
    mock: false,
    managerOnly: false,
    activePrefix: '/reglages',
  },
] as const

export function TabNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const rawSearch = useRouterState({ select: (s) => s.location.search })
  const parsed = shellSearchSchema.safeParse(rawSearch)
  const search = parsed.success ? parsed.data : {}
  const { canManageCollections } = usePermissions()

  const visibleTabs = tabs.filter(
    (tab) =>
      !tab.mock && (!tab.managerOnly || canManageCollections),
  )

  return (
    <nav className="tab-nav" aria-label="Navigation principale">
      {visibleTabs.map((tab) => {
        const activePrefix =
          'activePrefix' in tab ? tab.activePrefix : undefined
        const isActive = activePrefix
          ? pathname.startsWith(activePrefix)
          : tab.to === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.to)

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
