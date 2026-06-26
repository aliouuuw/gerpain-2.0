import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import {
  groupDeliveryItemsByProduct,
  lineTotal,
  soldQty,
  type PeriodDraft,
} from '#/lib/delivery-grid'
import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import { formatRpcError } from '#/lib/rpc-error'
import { isProductRowTouched, runEntryProgress } from '#/lib/run-progress'

type ItemDraft = { entrusted: number; returned: number }

type DeliveryRunPanelProps = {
  runId: string
  bakeryId: string
  onClose: () => void
  onValidated?: () => void
  inline?: boolean
}

function PeriodGroup({
  periodLabel,
  draft,
  editable,
  onChange,
}: {
  periodLabel: string
  draft: PeriodDraft | null
  editable: boolean
  onChange: (patch: Partial<ItemDraft>) => void
}) {
  const [returnHint, setReturnHint] = useState(false)

  if (!draft) {
    return (
      <div className="period-group">
        <div className="period-group__header">{periodLabel}</div>
        <span className="cell-muted mt-2">—</span>
      </div>
    )
  }

  return (
    <div className="period-group">
      <div className="period-group__header">{periodLabel}</div>
      <div className="input-pair">
        <div className="input-field">
          <span className="input-field__label">Confié</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft.entrusted === 0 ? '' : draft.entrusted}
            placeholder="0"
            disabled={!editable}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '')
              const val = raw === '' ? 0 : Number.parseInt(raw, 10)
              setReturnHint(false)
              onChange({ entrusted: val })
            }}
          />
        </div>
        <div className="input-field">
          <span className="input-field__label">Retour</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft.returned === 0 ? '' : draft.returned}
            placeholder="0"
            disabled={!editable}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '')
              const val = raw === '' ? 0 : Number.parseInt(raw, 10)
              setReturnHint(val > draft.entrusted)
              onChange({ returned: val })
            }}
          />
        </div>
      </div>
      {returnHint ? (
        <span className="delivery-period-cell__hint">Retour ≤ confié</span>
      ) : null}
    </div>
  )
}

export function DeliveryRunPanel({
  runId,
  bakeryId,
  onClose,
  onValidated,
  inline = false,
}: DeliveryRunPanelProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
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
        setConfirmOpen(false)
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
            queryKey: orpc.collections.list.key(),
          }),
        ])
        onValidated?.()
      },
      onError: (err) => {
        setError(formatRpcError(err))
        setConfirmOpen(false)
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

  const flushDirtyItems = useCallback(async (): Promise<boolean> => {
    if (!run.data || dirtyItems.length === 0) return true
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
      return true
    } catch {
      // error surfaced via mutation onError
      return false
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

  const confirmStats = useMemo(() => {
    if (!run.data) return { entered: 0, total: 0, totalSold: 0, expected: 0 }
    const itemsWithDrafts = run.data.items.map((item) => {
      const draft = drafts[item.id]
      return {
        ...item,
        quantityEntrusted: draft?.entrusted ?? item.quantityEntrusted,
        quantityReturned: draft?.returned ?? item.quantityReturned,
      }
    })
    return runEntryProgress(itemsWithDrafts)
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
        const saved = await flushDirtyItems()
        if (!saved) {
          setConfirmOpen(false)
          return
        }
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

  const panelBody = (
    <>
      {!inline ? (
        <div className="delivery-run-panel__header">
          {run.data ? (
            <p className="settings-form__hint">
              {run.data.locationName} · {run.data.date}
              {run.data.status === 'validated' ? ' · Validé' : ' · Brouillon'}
            </p>
          ) : null}
          <button type="button" className="table-action" onClick={onClose}>
            Fermer
          </button>
        </div>
      ) : null}

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
            <div className="delivery-product-list">
              {rows.map((row) => {
                const matin = draftFor(row.matin)
                const soir = draftFor(row.soir)
                const rowTotal =
                  lineTotal(matin, row.unitPrice) +
                  lineTotal(soir, row.unitPrice)
                const touched = isProductRowTouched(matin, soir)
                const rowSold =
                  (matin ? soldQty(matin) : 0) + (soir ? soldQty(soir) : 0)

                return (
                  <div
                    key={row.productId}
                    className={`delivery-product-row ${
                      !touched ? 'delivery-product-row--muted' : ''
                    }`}
                  >
                    <div className="product-meta">
                      <span className="product-name">{row.productName}</span>
                      <span className="product-price">
                        {formatXof(row.unitPrice)} / u
                      </span>
                    </div>
                    
                    <PeriodGroup
                      periodLabel="Matin"
                      draft={matin}
                      editable={editable}
                      onChange={(patch) => updateDraft(matin!.itemId, patch)}
                    />
                    
                    <PeriodGroup
                      periodLabel="Soir"
                      draft={soir}
                      editable={editable}
                      onChange={(patch) => updateDraft(soir!.itemId, patch)}
                    />

                    <div className="product-result">
                      <span className="product-result-money">
                        {rowTotal > 0 ? formatXof(rowTotal) : '—'}
                      </span>
                      {rowSold > 0 ? (
                        <span className="product-result-qty">
                          {rowSold} vendus
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="panel-footer--sticky">
            <span className="delivery-run-panel__total">
              CA attendu : <strong>{formatXof(totalExpected)}</strong>
            </span>
            {editable ? (
              <button
                type="button"
                className="btn-primary"
                disabled={validate.isPending || rows.length === 0}
                onClick={() => setConfirmOpen(true)}
              >
                Valider la tournée
              </button>
            ) : null}
          </div>

          <ConfirmDialog
            open={confirmOpen}
            title={`Valider ${run.data.employeeName} ?`}
            confirmLabel="Valider"
            loading={validate.isPending}
            onCancel={() => setConfirmOpen(false)}
            onConfirm={() => void handleValidate()}
          >
            <p>
              {confirmStats.totalSold} unité
              {confirmStats.totalSold > 1 ? 's' : ''} vendue
              {confirmStats.totalSold > 1 ? 's' : ''} sur{' '}
              {confirmStats.entered}/{confirmStats.total} produit
              {confirmStats.total > 1 ? 's' : ''} saisi
              {confirmStats.entered > 1 ? 's' : ''}.
            </p>
            <p>
              CA attendu : <strong>{formatXof(confirmStats.expected)}</strong>
            </p>
            <p className="settings-form__hint">
              Un encaissement sera créé automatiquement.
            </p>
          </ConfirmDialog>
        </>
      )}
    </>
  )

  if (inline) {
    return (
      <div className="delivery-run-panel delivery-run-panel--inline">
        {panelBody}
      </div>
    )
  }

  return (
    <div className="delivery-run-panel settings-card--wide">
      <div className="card-header">
        {run.data ? `Saisie — ${run.data.employeeName}` : 'Saisie tournée'}
      </div>
      <div className="card-body">{panelBody}</div>
    </div>
  )
}
