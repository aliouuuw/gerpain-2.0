import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { orpc } from '#/lib/orpc-client'

export const Route = createFileRoute('/deliveries')({
  component: DeliveriesPage,
})

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    submitted: 'Soumis',
    validated: 'Validé',
    rejected: 'Rejeté',
  }
  return labels[status] ?? status
}

function DeliveriesPage() {
  const [date, setDate] = useState(todayIso)

  const bakeries = useQuery(orpc.bakeries.list.queryOptions({}))
  const bakeryId = bakeries.data?.[0]?.id ?? ''

  const runs = useQuery({
    ...orpc.deliveries.listRuns.queryOptions({
      input: { bakeryId, date },
    }),
    enabled: Boolean(bakeryId),
  })

  const totalItems = useMemo(
    () => runs.data?.reduce((sum, run) => sum + run.items.length, 0) ?? 0,
    [runs.data],
  )

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            Ventes
          </p>
          <h1 className="mt-1 text-3xl font-bold text-neutral-900">
            Livraisons
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
        {bakeries.data && bakeries.data.length > 0 ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-700">Boulangerie</p>
            <p className="text-sm text-neutral-600">
              {bakeries.data[0]!.name} ({bakeries.data[0]!.code})
            </p>
          </div>
        ) : null}
      </div>

      {bakeries.isLoading ? (
        <p className="mt-8 text-sm text-neutral-500">Chargement des boulangeries…</p>
      ) : bakeries.isError ? (
        <p className="mt-8 text-sm text-red-600">
          Impossible de charger les boulangeries.
        </p>
      ) : !bakeryId ? (
        <p className="mt-8 text-sm text-neutral-600">
          Aucune boulangerie configurée pour cette organisation.
        </p>
      ) : runs.isLoading ? (
        <p className="mt-8 text-sm text-neutral-500">Chargement des tournées…</p>
      ) : runs.isError ? (
        <p className="mt-8 text-sm text-red-600">
          Impossible de charger les tournées.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-neutral-600">
            {runs.data?.length ?? 0} tournée(s) · {totalItems} ligne(s) produit
          </p>

          {runs.data && runs.data.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-neutral-700">
                      Livreur
                    </th>
                    <th className="px-4 py-3 font-medium text-neutral-700">
                      Point de vente
                    </th>
                    <th className="px-4 py-3 font-medium text-neutral-700">
                      Statut
                    </th>
                    <th className="px-4 py-3 font-medium text-neutral-700">
                      Produits
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {runs.data.map((run) => (
                    <tr key={run.id}>
                      <td className="px-4 py-3 text-neutral-900">
                        {run.employeeName}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {run.locationName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            run.status === 'validated'
                              ? 'text-emerald-700'
                              : run.status === 'draft'
                                ? 'text-neutral-600'
                                : 'text-amber-700'
                          }
                        >
                          {formatStatus(run.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {run.items.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-8 rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
              Aucune tournée pour cette date.
            </p>
          )}
        </>
      )}
    </div>
  )
}
