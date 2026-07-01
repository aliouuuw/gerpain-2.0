import { Link, Outlet, useRouterState } from '@tanstack/react-router'

import { shellSearchSchema } from '#/lib/shell-date'

export type SectionNavItem = {
  to: string
  label: string
  hint?: string
  disabled?: boolean
  /** Extra path prefix that should mark this item active (e.g. drill-down routes). */
  matchPath?: string
  /** Optional group heading; consecutive items sharing a group render under one heading. */
  group?: string
}

export type SectionNavLayoutProps = {
  navLabel: string
  items: readonly SectionNavItem[]
}

export function SectionNavLayout({ navLabel, items }: SectionNavLayoutProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const rawSearch = useRouterState({ select: (s) => s.location.search })
  const parsed = shellSearchSchema.safeParse(rawSearch)
  const search = parsed.success ? parsed.data : {}

  return (
    <div className="section-nav-layout">
      <aside className="section-nav">
        <nav className="section-nav__list" aria-label={navLabel}>
          {items.map((item, index) => {
            const isActive =
              pathname === item.to ||
              pathname.startsWith(`${item.to}/`) ||
              (item.matchPath != null && pathname.startsWith(item.matchPath))

            const previousGroup = index > 0 ? items[index - 1]?.group : undefined
            const showGroupHeading =
              item.group != null && item.group !== previousGroup

            const link = item.disabled ? (
              <span
                key={item.to}
                className="section-nav__link section-nav__link--disabled"
                title={item.hint}
                aria-disabled="true"
              >
                {item.label}
                <span className="section-nav__badge">Bientôt</span>
              </span>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                search={search}
                className={`section-nav__link${isActive ? ' section-nav__link--active' : ''}`}
                title={item.hint}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            )

            if (showGroupHeading) {
              return (
                <div key={`group-${item.group}`} className="section-nav__group">
                  <p className="section-nav__group-label">{item.group}</p>
                  {link}
                </div>
              )
            }

            return link
          })}
        </nav>
      </aside>
      <div className="section-nav-layout__content">
        <Outlet />
      </div>
    </div>
  )
}
