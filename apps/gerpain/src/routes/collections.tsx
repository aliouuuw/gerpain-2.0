import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireSession } from '#/server/require-session-fn'

export const Route = createFileRoute('/collections')({
  beforeLoad: async () => {
    await requireSession()
  },
  component: CollectionsLayout,
})

function CollectionsLayout() {
  return <Outlet />
}
