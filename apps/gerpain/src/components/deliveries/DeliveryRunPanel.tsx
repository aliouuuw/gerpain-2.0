import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import {
  groupDeliveryItemsByProduct,
  lineTotal,
  soldQty,
  type PeriodDraft,
} from '#/lib/delivery-grid'
import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import { formatRpcError } from '#/lib/rpc-error'

type ItemDraft = { entrusted: number; returned: number }

type DeliveryRunPanelProps = {
  runId: string
  bakeryId: string
  onClose: () => void
  onValidated?: () => void
}

function QtyInput({
  label,
  value,
  max,
  disabled,
  onChange,
}: {
  label: string
  value: number
  max?: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    <label className="delivery-qty">
      <span className="delivery-qty__label">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </label>
  )
}

function PeriodCell({
  period: draft,
  editable,
  onChange,
}: {
  period: PeriodDraft
  editable: boolean
  onChange: (patch: Partial<ItemDraft>) => void
}) {
  return (
    <div className="delivery-period-cell">
      <QtyInput
        label="Confié"
        value={draft.entrusted}
        disabled={!editable}
        onChange={(entrusted) => onChange({ entrusted })}
      />
      <QtyInput
        label="Retour"
        value={draft.returned}
        max={draft.entrusted}
        disabled={!editable}
        onChange={(returned) => onChange({ returned })}
      />
      <span className="delivery-period-cell__sold">
        Vendu {soldQty(draft)}
      </span>
    </div>
  )
}

export function DeliveryRunPanel({
  runId,
  bakeryId,
  onClose,
  onValidated,
}: DeliveryRunPanelProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
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
    setError(null)
    setMessage(null)
  }, [run.data])

  const updateItem = useMutation(
    orpc.deliveries.updateItem.mutationOptions({
      onSuccess: async () => {
        setError(null)
        await queryClient.invalidateQueries({
          queryKey: orpc.deliveries.getRun.key({ input: { runId } }),
        })
      },
      onError: (err) => {
        setSaveState('idle')
        setError(formatRpcError(err))
      },
    }),
  )

  const validate = useMutation(
    orpc.deliveries.validateRun.mutationOptions({
      onSuccess: async () => {
        setMessage('Tournée validée — encaissement créé.')
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: orpc.deliveries.getRun.key({ input: { runId } }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.deliveries.listRuns.key({
              input: { bakeryId, date: run.data?.date },
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: orpc.collections.list.key({
              input: { bakeryId, date: run.data?.date },
            }),
          }),
        ])
        onValidated?.()
      },
      onError: (err) => {
        setError(formatRpcError(err))
      },
    }),
  )

  const rows = useMemo(
    () => groupDeliveryItemsByProduct(run.data?.items ?? []),
    [run.data?.items],
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
      // handled in mutation onError
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

  function updateDraft(itemId: string, patch: Partial<ItemDraft>) {
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

  async function handleValidate() {
    setError(null)
    setMessage(null)
    try {
      if (dirtyItems.length > 0) {
        await flushDirtyItems()
      }
      await validate.mutateAsync({ runId })
    } catch (err) {
      setError(formatRpcError(err))
    }
  }

  function draftFor(period: PeriodDraft | null): PeriodDraft | null {
    if (!period) return null
    const draft = drafts[period.itemId]
    if (!draft) return period
    return { ...period, ...draft }
  }

  return (
    <Card
      title={run.data ? `Saisie — ${run.data.employeeName}` : 'Saisie tournée'}
      className="settings-card--wide delivery-run-panel"
    >
      <div className="delivery-run-panel__header">
        {run.data ? (
          <p className="settings-form__hint">
            {run.data.locationName} · {run.data.date}
            {run.data.status === 'validated' ? (
              <Badge variant="success">Validé</Badge>
            ) : (
              <Badge variant="neutral">Brouillon</Badge>
            )}
          </p>
        ) : null}
        <button type="button" className="table-action" onClick={onClose}>
          Fermer
        </button>
      </div>

      {run.isLoading ? (
        <p className="settings-form__hint">Chargement de la tournée…</p>
      ) : run.isError || !run.data ? (
        <p className="settings-form__error">Tournée introuvable.</p>
      ) : (
        <>
          {editable ? (
            <p className="settings-form__hint">
              {saveState === 'saving'
                ? 'Enregistrement…'
                : saveState === 'saved'
                  ? 'Modifications enregistrées'
                  : dirtyItems.length > 0
                    ? 'Modifications en attente…'
                    : 'Saisissez confié et retour par produit (Matin / Soir)'}
            </p>
          ) : null}

          {error ? <p className="settings-form__error">{error}</p> : null}
          {message ? (
            <p className="delivery-run-panel__success">{message}</p>
          ) : null}

          {rows.length === 0 ? (
            <p className="settings-form__hint">
              Aucun produit assigné à cet agent. Configurez les produits dans
              Équipe.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="data-table delivery-grid">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Matin — confié / retour</th>
                    <th>Soir — confié / retour</th>
                    <th>CA ligne</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const matin = draftFor(row.matin)
                    const soir = draftFor(row.soir)
                    const rowTotal =
                      lineTotal(matin, row.unitPrice) +
                      lineTotal(soir, row.unitPrice)

                    return (
                      <tr key={row.productId}>
                        <td>
                          <span className="cell-agent">{row.productName}</span>
                          <span className="cell-sub">
                            {formatXof(row.unitPrice)} / u
                          </span>
                        </td>
                        <td>
                          {matin ? (
                            <PeriodCell
                              period={matin}
                              editable={editable}
                              onChange={(patch) =>
                                updateDraft(matin.itemId, patch)
                              }
                            />
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          {soir ? (
                            <PeriodCell
                              period={soir}
                              editable={editable}
                              onChange={(patch) =>
                                updateDraft(soir.itemId, patch)
                              }
                            />
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="cell-money">
                          {rowTotal > 0 ? formatXof(rowTotal) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="delivery-run-panel__footer">
            <span className="delivery-run-panel__total">
              CA attendu : <strong>{formatXof(totalExpected)}</strong>
            </span>
            {editable ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={validate.isPending || rows.length === 0}
                onClick={() => void handleValidate()}
              >
                {validate.isPending ? 'Validation…' : 'Valider la tournée'}
              </button>
            ) : null}
          </div>
        </>
      )}
    </Card>
  )
}
