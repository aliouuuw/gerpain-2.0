import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { orpc } from '#/lib/orpc-client'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const health = useQuery(orpc.health.ping.queryOptions({}))

  return (
    <div className="mx-auto max-w-2xl p-8">
      <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
        Gerpain 2.0
      </p>
      <h1 className="mt-2 text-4xl font-bold text-neutral-900">
        Distribution boulangerie
      </h1>
      <p className="mt-4 text-lg text-neutral-600">
        Base unifiée TanStack Start + oRPC — migration en cours depuis le stack
        Hono / Next.js.
      </p>

      <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <p className="text-sm font-medium text-neutral-700">API oRPC</p>
        {health.isLoading ? (
          <p className="mt-2 text-sm text-neutral-500">Vérification…</p>
        ) : health.isError ? (
          <p className="mt-2 text-sm text-red-600">Service indisponible</p>
        ) : (
          <p className="mt-2 font-mono text-sm text-emerald-700">
            health.ping → {JSON.stringify(health.data)}
          </p>
        )}
      </div>
    </div>
  )
}
