import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { orpc } from '#/lib/orpc-client'

export const Route = createFileRoute('/deliveries/$runId')({
  component: DeliveryRunPage,
})

function formatXof(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} XOF`
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

function DeliveryRunPage() {
  const { runId } = Route.useParams()
  const queryClient = useQueryClient()
  const [validateMessage, setValidateMessage] = useState<string | null>(null)
  const [itemError, setItemError] = useState<string | null>(null)

  const run = useQuery(
    orpc.deliveries.getRun.queryOptions({ input: { runId } }),
  )

  const updateItem = useMutation(
    orpc.deliveries.updateItem.mutationOptions({
      onSuccess: async () => {
        setItemError(null)
        await queryClient.invalidateQueries({
          queryKey: orpc.deliveries.getRun.key({ input: { runId } }),
        })
      },
      onError: (error) => {
        setItemError(
          error instanceof Error ? error.message : 'Échec de la mise à jour',
        )
      },
    }),
  )

  const validate = useMutation(
    orpc.deliveries.validateRun.mutationOptions({
      onSuccess: async (data) => {
        setValidateMessage(
          `Tournée validée — encaissement attendu : ${formatXof(data.collection.expectedAmount)}`,
        )
        await queryClient.invalidateQueries({
          queryKey: orpc.deliveries.getRun.key({ input: { runId } }),
        })
      },
      onError: (error) => {
        setValidateMessage(null)
        setItemError(
          error instanceof Error ? error.message : 'Échec de la validation',
        )
      },
    }),
  )

  const editable = run.data?.status === 'draft'

  const totalExpected =
    run.data?.items.reduce(
      (sum, item) => sum + item.quantitySold * item.unitPrice,
      0,
    ) ?? 0

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            Tournée
          </p>
          <h1 className="mt-1 text-3xl font-bold text-neutral-900">
            {run.data?.employeeName ?? '…'}
          </h1>
          {run.data ? (
            <p className="mt-2 text-sm text-neutral-600">
              {run.data.date} · {run.data.locationName} ·{' '}
              <span
                className={
                  run.data.status === 'validated'
                    ? 'text-emerald-700'
                    : 'text-neutral-700'
                }
              >
                {formatStatus(run.data.status)}
              </span>
            </p>
          ) : null}
        </div>
        <Link
          to="/deliveries"
          className="text-sm text-neutral-500 underline hover:text-neutral-800"
        >
          Retour aux livraisons
        </Link>
      </div>

      {run.isLoading ? (
        <p className="mt-8 text-sm text-neutral-500">Chargement…</p>
      ) : run.isError ? (
        <p className="mt-8 text-sm text-red-600">Tournée introuvable.</p>
      ) : run.data ? (
        <>
          {itemError ? (
            <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {itemError}
            </p>
          ) : null}
          {validateMessage ? (
            <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {validateMessage}
            </p>
          ) : null}

          <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-neutral-700">
                    Produit
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-700">
                    Confié
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-700">
                    Retourné
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-700">
                    Vendu
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-700">
                    Montant
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {run.data.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    editable={editable}
                    saving={updateItem.isPending}
                    onSave={(values) =>
                      updateItem.mutate({ itemId: item.id, ...values })
                    }
                  />
                ))}
              </tbody>
              <tfoot className="border-t border-neutral-200 bg-neutral-50">
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right font-medium text-neutral-700"
                  >
                    Total attendu
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {formatXof(totalExpected)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {editable ? (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={validate.isPending || totalExpected === 0}
                onClick={() => validate.mutate({ runId })}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {validate.isPending ? 'Validation…' : 'Valider la tournée'}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function ItemRow({
  item,
  editable,
  saving,
  onSave,
}: {
  item: {
    id: string
    productName: string
    quantityEntrusted: number
    quantityReturned: number
    quantitySold: number
    unitPrice: number
  }
  editable: boolean
  saving: boolean
  onSave: (values: {
    quantityEntrusted: number
    quantityReturned: number
  }) => void
}) {
  const [entrusted, setEntrusted] = useState(item.quantityEntrusted)
  const [returned, setReturned] = useState(item.quantityReturned)

  useEffect(() => {
    setEntrusted(item.quantityEntrusted)
    setReturned(item.quantityReturned)
  }, [item.quantityEntrusted, item.quantityReturned])

  const sold = Math.max(0, entrusted - returned)
  const lineTotal = sold * item.unitPrice

  function commit() {
    if (!editable || saving) return
    if (
      entrusted === item.quantityEntrusted &&
      returned === item.quantityReturned
    ) {
      return
    }
    onSave({ quantityEntrusted: entrusted, quantityReturned: returned })
  }

  return (
    <tr>
      <td className="px-4 py-3 text-neutral-900">{item.productName}</td>
      <td className="px-4 py-3">
        {editable ? (
          <input
            type="number"
            min={0}
            value={entrusted}
            onChange={(e) => setEntrusted(Number(e.target.value) || 0)}
            onBlur={commit}
            className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        ) : (
          <span className="text-neutral-600">{item.quantityEntrusted}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {editable ? (
          <input
            type="number"
            min={0}
            max={entrusted}
            value={returned}
            onChange={(e) => setReturned(Number(e.target.value) || 0)}
            onBlur={commit}
            className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        ) : (
          <span className="text-neutral-600">{item.quantityReturned}</span>
        )}
      </td>
      <td className="px-4 py-3 text-neutral-600">{sold}</td>
      <td className="px-4 py-3 text-neutral-600">{formatXof(lineTotal)}</td>
    </tr>
  )
}
