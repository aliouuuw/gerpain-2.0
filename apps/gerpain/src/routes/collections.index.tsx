import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'

export const Route = createFileRoute('/collections/')({
  component: CollectionsPage,
})

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    submitted: 'Soumis',
    validated: 'Validé',
    rejected: 'Rejeté',
  }
  return labels[status] ?? status
}

function CollectionsPage() {
  const [date, setDate] = useState(todayIso)

  const bakeries = useQuery(orpc.bakeries.list.queryOptions({}))
  const bakeryId = bakeries.data?.[0]?.id ?? ''

  const collections = useQuery({
    ...orpc.collections.list.queryOptions({
      input: { bakeryId, date },
    }),
    enabled: Boolean(bakeryId),
  })

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            Caisse
          </p>
          <h1 className="mt-1 text-3xl font-bold text-neutral-900">
            Encaissements
          </h1>
        </div>
        <Link
          to="/"
          className="text-sm text-neutral-500 underline hover:text-neutral-800"
        >
          Accueil
        </Link>
      </div>

      <div className="mt-8 flex flex-wrap items-end gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <div className="space-y-1">
          <label htmlFor="date" className="text-sm font-medium text-neutral-700">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        {bakeries.data?.[0] ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-700">Boulangerie</p>
            <p className="text-sm text-neutral-600">
              {bakeries.data[0].name} ({bakeries.data[0].code})
            </p>
          </div>
        ) : null}
      </div>

      {collections.isLoading ? (
        <p className="mt-8 text-sm text-neutral-500">Chargement…</p>
      ) : collections.isError ? (
        <p className="mt-8 text-sm text-red-600">
          Impossible de charger les encaissements.
        </p>
      ) : collections.data && collections.data.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr>
                <th className="px-4 py-3 font-medium text-neutral-700">
                  Employé
                </th>
                <th className="px-4 py-3 font-medium text-neutral-700">
                  Source
                </th>
                <th className="px-4 py-3 font-medium text-neutral-700">
                  Attendu
                </th>
                <th className="px-4 py-3 font-medium text-neutral-700">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {collections.data.map((col) => (
                <tr key={col.id}>
                  <td className="px-4 py-3">
                    <Link
                      to="/collections/$collectionId"
                      params={{ collectionId: col.id }}
                      className="font-medium text-neutral-900 underline"
                    >
                      {col.employeeName}
                    </Link>
                    <span className="ml-2 text-neutral-500">
                      ({col.routeLabel})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{col.source}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatXof(col.expectedAmount)}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {formatStatus(col.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-8 rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Aucun encaissement pour cette date. Validez une tournée de livraison
          pour en créer un.
        </p>
      )}
    </div>
  )
}
