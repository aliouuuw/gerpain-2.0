import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/deliveries')({
  component: DeliveriesLayout,
})

function DeliveriesLayout() {
  return <Outlet />
}
