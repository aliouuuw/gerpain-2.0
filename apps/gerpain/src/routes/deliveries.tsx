import { createFileRoute, Outlet } from '@tanstack/react-router'

import { requireSession } from '#/server/require-session-fn'

export const Route = createFileRoute('/deliveries')({
  beforeLoad: async () => {
    await requireSession()
  },
  component: DeliveriesLayout,
})

function DeliveriesLayout() {
  return <Outlet />
}
