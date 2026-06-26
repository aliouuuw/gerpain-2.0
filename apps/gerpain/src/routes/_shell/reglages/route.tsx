import { createFileRoute } from '@tanstack/react-router'

import { SectionNavLayout } from '#/components/layout/SectionNavLayout'
import { settingsNavItems } from '#/lib/settings-nav'

export const Route = createFileRoute('/_shell/reglages')({
  component: ReglagesLayout,
})

function ReglagesLayout() {
  return (
    <main className="page-content">
      <SectionNavLayout navLabel="Réglages" items={settingsNavItems} />
    </main>
  )
}
