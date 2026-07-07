import { createFileRoute, redirect } from '@tanstack/react-router'

import { SectionNavLayout } from '#/components/layout/SectionNavLayout'
import { settingsNavItems } from '#/lib/settings-nav'
import { shellSearchSchema } from '#/lib/shell-date'

export const Route = createFileRoute('/_shell/reglages')({
  beforeLoad: ({ location, search }) => {
    const normalized = location.pathname.replace(/\/$/, '') || '/'
    if (normalized === '/reglages') {
      const parsed = shellSearchSchema.safeParse(search)
      throw redirect({
        to: '/reglages/boulangerie',
        search: parsed.success ? parsed.data : {},
      })
    }
  },
  component: ReglagesLayout,
})

function ReglagesLayout() {
  return (
    <main className="page-content">
      <SectionNavLayout navLabel="Réglages" items={settingsNavItems} />
    </main>
  )
}
