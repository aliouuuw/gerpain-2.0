import { Link, Outlet, useRouterState } from '@tanstack/react-router'

import { shellSearchSchema } from '#/lib/shell-date'

export type SectionNavItem = {
  to: string
  label: string
  hint?: string
  disabled?: boolean
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
          {items.map((item) => {
            const isActive = pathname === item.to || pathname.startsWith(`${item.to}/`)

            if (item.disabled) {
              return (
                <span
                  key={item.to}
                  className="section-nav__link section-nav__link--disabled"
                  title={item.hint}
                  aria-disabled="true"
                >
                  {item.label}
                  <span className="section-nav__badge">Bientôt</span>
                </span>
              )
            }

            return (
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
          })}
        </nav>
      </aside>
      <div className="section-nav-layout__content">
        <Outlet />
      </div>
    </div>
  )
}
