import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { orpc } from '#/lib/orpc-client'

export const Route = createFileRoute('/deliveries/$runId')({
  component: DeliveryRunRedirect,
})

function DeliveryRunRedirect() {
  const { runId } = Route.useParams()
  const navigate = useNavigate()

  const run = useQuery(
    orpc.deliveries.getRun.queryOptions({ input: { runId } }),
  )

  useEffect(() => {
    if (!run.data) return
    void navigate({
      to: '/livraisons',
      search: { date: run.data.date },
      replace: true,
    })
  }, [navigate, run.data])

  if (run.isError) {
    return (
      <main className="page-content">
        <p className="empty-state">Tournée introuvable.</p>
      </main>
    )
  }

  return (
    <main className="page-content">
      <p className="empty-state">Redirection vers Livraisons…</p>
    </main>
  )
}
