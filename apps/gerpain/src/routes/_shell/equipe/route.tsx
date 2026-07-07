import { createFileRoute, redirect } from '@tanstack/react-router'

import { SectionNavLayout } from '#/components/layout/SectionNavLayout'
import { equipeNavItems } from '#/lib/equipe-nav'
import { shellSearchSchema } from '#/lib/shell-date'

export const Route = createFileRoute('/_shell/equipe')({
  beforeLoad: ({ location, search }) => {
    const normalized = location.pathname.replace(/\/$/, '') || '/'
    if (normalized === '/equipe') {
      const parsed = shellSearchSchema.safeParse(search)
      throw redirect({
        to: '/equipe/annuaire',
        search: parsed.success ? parsed.data : {},
      })
    }
  },
  component: EquipeLayout,
})

function EquipeLayout() {
  return (
    <main className="page-content">
      <SectionNavLayout navLabel="Personnel & paie" items={equipeNavItems} />
    </main>
  )
}
