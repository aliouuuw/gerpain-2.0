import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { z } from 'zod'

import { useBakery } from '#/lib/bakery-context'
import { orpc } from '#/lib/orpc-client'
import { todayIso } from '#/lib/today'

const deliveriesSearchSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  employeeId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'validated', 'rejected']).optional(),
})

export const Route = createFileRoute('/deliveries/')({
  validateSearch: deliveriesSearchSchema,
  component: DeliveriesPage,
})

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
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const date = search.date ?? todayIso()
  const useRange = Boolean(search.startDate || search.endDate)

  const { bakery, bakeryId, bakeries, isLoading: bakeryLoading, isError: bakeryError } =
    useBakery()

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({
      input: { bakeryId, status: 'active', role: 'delivery' },
    }),
    enabled: Boolean(bakeryId),
  })

  const locations = useQuery({
    ...orpc.locations.list.queryOptions({
      input: { bakeryId },
    }),
    enabled: Boolean(bakeryId),
  })

  const runs = useQuery({
    ...orpc.deliveries.listRuns.queryOptions({
      input: useRange
        ? {
            bakeryId,
            startDate: search.startDate,
            endDate: search.endDate,
            employeeId: search.employeeId,
            locationId: search.locationId,
            status: search.status,
          }
        : {
            bakeryId,
            date,
            employeeId: search.employeeId,
            locationId: search.locationId,
            status: search.status,
          },
    }),
    enabled: Boolean(bakeryId),
  })

  const totalItems = useMemo(
    () => runs.data?.reduce((sum, run) => sum + run.items.length, 0) ?? 0,
    [runs.data],
  )

  const hasFilters =
    Boolean(search.employeeId) ||
    Boolean(search.locationId) ||
    Boolean(search.status) ||
    useRange

  function patchSearch(patch: Partial<typeof search>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
    })
  }

  function clearFilters() {
    void navigate({
      search: { date },
      replace: true,
    })
  }

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
            {useRange ? 'Date (mode plage)' : 'Date'}
          </label>
          <input
            id="date"
            type="date"
            value={date}
            disabled={useRange}
            onChange={(e) => patchSearch({ date: e.target.value })}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="startDate" className="text-sm font-medium text-neutral-700">
            Du
          </label>
          <input
            id="startDate"
            type="date"
            value={search.startDate ?? ''}
            onChange={(e) =>
              patchSearch({ startDate: e.target.value || undefined })
            }
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="endDate" className="text-sm font-medium text-neutral-700">
            Au
          </label>
          <input
            id="endDate"
            type="date"
            value={search.endDate ?? ''}
            onChange={(e) => patchSearch({ endDate: e.target.value || undefined })}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="employee" className="text-sm font-medium text-neutral-700">
            Livreur
          </label>
          <select
            id="employee"
            value={search.employeeId ?? ''}
            onChange={(e) =>
              patchSearch({ employeeId: e.target.value || undefined })
            }
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {employees.data?.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="location" className="text-sm font-medium text-neutral-700">
            Point de vente
          </label>
          <select
            id="location"
            value={search.locationId ?? ''}
            onChange={(e) =>
              patchSearch({ locationId: e.target.value || undefined })
            }
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            {locations.data?.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="status" className="text-sm font-medium text-neutral-700">
            Statut
          </label>
          <select
            id="status"
            value={search.status ?? ''}
            onChange={(e) =>
              patchSearch({
                status: (e.target.value || undefined) as
                  | 'draft'
                  | 'submitted'
                  | 'validated'
                  | 'rejected'
                  | undefined,
              })
            }
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Tous</option>
            <option value="draft">Brouillon</option>
            <option value="validated">Validé</option>
          </select>
        </div>
        {hasFilters ? (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
          >
            Effacer les filtres
          </button>
        ) : null}
        {bakeries.length > 0 && bakery ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-700">Boulangerie</p>
            <p className="text-sm text-neutral-600">
              {bakery.name} ({bakery.code})
            </p>
          </div>
        ) : null}
      </div>

      {bakeryLoading ? (
        <p className="mt-8 text-sm text-neutral-500">Chargement des boulangeries…</p>
      ) : bakeryError ? (
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
                    <th className="px-4 py-3 font-medium text-neutral-700">Date</th>
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
                      <td className="px-4 py-3 text-neutral-600">{run.date}</td>
                      <td className="px-4 py-3">
                        <Link
                          to="/deliveries/$runId"
                          params={{ runId: run.id }}
                          className="font-medium text-neutral-900 underline"
                        >
                          {run.employeeName}
                        </Link>
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
              Aucune tournée pour ces filtres.
            </p>
          )}
        </>
      )}
    </div>
  )
}
