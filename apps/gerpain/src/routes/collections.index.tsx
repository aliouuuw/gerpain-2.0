import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { useBakery } from '#/lib/bakery-context'
import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import { formatRpcError } from '#/lib/rpc-error'
import { usePermissions } from '#/lib/use-permissions'
import { todayIso } from '#/lib/today'

export const Route = createFileRoute('/collections/')({
  component: CollectionsPage,
})

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
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { bakery, bakeryId } = useBakery()
  const { canManageCollections } = usePermissions()

  const collections = useQuery({
    ...orpc.collections.list.queryOptions({
      input: { bakeryId, date },
    }),
    enabled: Boolean(bakeryId),
  })

  const unsettledValidatedCount = useMemo(
    () =>
      collections.data?.filter(
        (col) => col.status === 'validated' && !col.isSettled,
      ).length ?? 0,
    [collections.data],
  )

  const settle = useMutation(
    orpc.collections.settle.mutationOptions({
      onSuccess: async (data) => {
        setError(null)
        setMessage(
          data.settledCount > 0
            ? `${data.settledCount} encaissement(s) clôturé(s) pour la paie.`
            : 'Aucun encaissement validé à clôturer pour cette date.',
        )
        await queryClient.invalidateQueries({
          queryKey: orpc.collections.list.key({ input: { bakeryId, date } }),
        })
      },
      onError: (err) => {
        setMessage(null)
        setError(formatRpcError(err))
      },
    }),
  )

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
        {bakery ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-700">Boulangerie</p>
            <p className="text-sm text-neutral-600">
              {bakery.name} ({bakery.code})
            </p>
          </div>
        ) : null}
        {canManageCollections && unsettledValidatedCount > 0 ? (
          <button
            type="button"
            disabled={settle.isPending || !bakeryId}
            onClick={() => settle.mutate({ bakeryId, date })}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {settle.isPending
              ? 'Clôture…'
              : `Clôturer ${unsettledValidatedCount} validé(s)`}
          </button>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

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
                <th className="px-4 py-3 font-medium text-neutral-700">
                  Paie
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
                  <td className="px-4 py-3 text-neutral-600">
                    {col.status === 'validated'
                      ? col.isSettled
                        ? 'Clôturé'
                        : 'À clôturer'
                      : '—'}
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
