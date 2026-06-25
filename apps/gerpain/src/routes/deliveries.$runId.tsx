import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { orpc } from '#/lib/orpc-client'
import { formatRpcError } from '#/lib/rpc-error'

export const Route = createFileRoute('/deliveries/$runId')({
  component: DeliveryRunPage,
})

type ItemDraft = { entrusted: number; returned: number }

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
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const run = useQuery(
    orpc.deliveries.getRun.queryOptions({ input: { runId } }),
  )

  const editable = run.data?.status === 'draft'

  useEffect(() => {
    if (!run.data) return
    setDrafts(
      Object.fromEntries(
        run.data.items.map((item) => [
          item.id,
          {
            entrusted: item.quantityEntrusted,
            returned: item.quantityReturned,
          },
        ]),
      ),
    )
    setSaveState('idle')
  }, [run.data])

  const updateItem = useMutation(
    orpc.deliveries.updateItem.mutationOptions({
      onSuccess: async () => {
        setItemError(null)
        await queryClient.invalidateQueries({
          queryKey: orpc.deliveries.getRun.key({ input: { runId } }),
        })
      },
      onError: (error) => {
        setSaveState('idle')
        setItemError(formatRpcError(error))
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
        setItemError(formatRpcError(error))
      },
    }),
  )

  const dirtyItems = useMemo(() => {
    if (!run.data) return []
    return run.data.items.filter((item) => {
      const draft = drafts[item.id]
      if (!draft) return false
      return (
        draft.entrusted !== item.quantityEntrusted ||
        draft.returned !== item.quantityReturned
      )
    })
  }, [run.data, drafts])

  const flushDirtyItems = useCallback(async () => {
    if (!run.data || dirtyItems.length === 0) return
    setSaveState('saving')
    try {
      for (const item of dirtyItems) {
        const draft = drafts[item.id]
        if (!draft) continue
        await updateItem.mutateAsync({
          itemId: item.id,
          quantityEntrusted: draft.entrusted,
          quantityReturned: draft.returned,
        })
      }
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 1500)
    } catch {
      // onError on mutation handles message
    }
  }, [dirtyItems, drafts, run.data, updateItem])

  useEffect(() => {
    if (!editable || dirtyItems.length === 0) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void flushDirtyItems()
    }, 500)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [dirtyItems, editable, flushDirtyItems])

  const totalExpected = useMemo(() => {
    if (!run.data) return 0
    return run.data.items.reduce((sum, item) => {
      const draft = drafts[item.id] ?? {
        entrusted: item.quantityEntrusted,
        returned: item.quantityReturned,
      }
      const sold = Math.max(0, draft.entrusted - draft.returned)
      return sum + sold * item.unitPrice
    }, 0)
  }, [run.data, drafts])

  async function handleValidate() {
    setItemError(null)
    setValidateMessage(null)
    try {
      if (dirtyItems.length > 0) {
        await flushDirtyItems()
      }
      await validate.mutateAsync({ runId })
    } catch (error) {
      setItemError(formatRpcError(error))
    }
  }

  function updateDraft(
    itemId: string,
    patch: Partial<ItemDraft>,
  ) {
    setDrafts((current) => {
      const previous = current[itemId]
      if (!previous) return current
      const next = { ...previous, ...patch }
      if (next.returned > next.entrusted) {
        next.returned = next.entrusted
      }
      return { ...current, [itemId]: next }
    })
    setSaveState('idle')
  }

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
          {editable ? (
            <p className="mt-4 text-sm text-neutral-500">
              {saveState === 'saving'
                ? 'Enregistrement…'
                : saveState === 'saved'
                  ? 'Modifications enregistrées'
                  : dirtyItems.length > 0
                    ? 'Modifications en attente…'
                    : 'Saisissez les quantités confiées et retournées'}
            </p>
          ) : null}

          {itemError ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {itemError}
            </p>
          ) : null}
          {validateMessage ? (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
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
                {run.data.items.map((item) => {
                  const draft = drafts[item.id] ?? {
                    entrusted: item.quantityEntrusted,
                    returned: item.quantityReturned,
                  }
                  const sold = Math.max(0, draft.entrusted - draft.returned)
                  const lineTotal = sold * item.unitPrice

                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 text-neutral-900">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3">
                        {editable ? (
                          <input
                            type="number"
                            min={0}
                            value={draft.entrusted}
                            onChange={(e) =>
                              updateDraft(item.id, {
                                entrusted: Number(e.target.value) || 0,
                              })
                            }
                            className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          <span className="text-neutral-600">
                            {item.quantityEntrusted}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editable ? (
                          <input
                            type="number"
                            min={0}
                            max={draft.entrusted}
                            value={draft.returned}
                            onChange={(e) =>
                              updateDraft(item.id, {
                                returned: Number(e.target.value) || 0,
                              })
                            }
                            className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          <span className="text-neutral-600">
                            {item.quantityReturned}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{sold}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatXof(lineTotal)}
                      </td>
                    </tr>
                  )
                })}
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
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              {dirtyItems.length > 0 ? (
                <button
                  type="button"
                  disabled={updateItem.isPending}
                  onClick={() => void flushDirtyItems()}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 disabled:opacity-50"
                >
                  {updateItem.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              ) : null}
              <button
                type="button"
                disabled={
                  validate.isPending ||
                  updateItem.isPending ||
                  totalExpected === 0
                }
                onClick={() => void handleValidate()}
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
