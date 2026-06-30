import { createFileRoute } from '@tanstack/react-router'

import { SectionNavLayout } from '#/components/layout/SectionNavLayout'
import { equipeNavItems } from '#/lib/equipe-nav'

export const Route = createFileRoute('/_shell/equipe')({
  component: EquipeLayout,
})

function EquipeLayout() {
  return (
    <main className="page-content">
      <SectionNavLayout navLabel="Personnel & paie" items={equipeNavItems} />
    </main>
  )
}
