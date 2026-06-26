import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import { formatRpcError } from '#/lib/rpc-error'
import { usePermissions } from '#/lib/use-permissions'

export const Route = createFileRoute('/collections/$collectionId')({
  component: CollectionDetailPage,
})

type PaymentDraft = {
  cashAmount: number
  cardAmount: number
  mobileAmount: number
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

function CollectionDetailPage() {
  const { collectionId } = Route.useParams()
  const queryClient = useQueryClient()
  const { canManageCollections } = usePermissions()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [draft, setDraft] = useState<PaymentDraft | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collection = useQuery(
    orpc.collections.get.queryOptions({ input: { collectionId } }),
  )

  const editable =
    collection.data?.status === 'pending' ||
    collection.data?.status === 'rejected'

  const reviewable = collection.data?.status === 'submitted'

  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    if (!collection.data) return
    setDraft({
      cashAmount: collection.data.cashAmount,
      cardAmount: collection.data.cardAmount,
      mobileAmount: collection.data.mobileAmount,
    })
    setSaveState('idle')
  }, [collection.data])

  const update = useMutation(
    orpc.collections.update.mutationOptions({
      onSuccess: async () => {
        setError(null)
        await queryClient.invalidateQueries({
          queryKey: orpc.collections.get.key({ input: { collectionId } }),
        })
      },
      onError: (err) => {
        setSaveState('idle')
        setError(formatRpcError(err))
      },
    }),
  )

  const submit = useMutation(
    orpc.collections.submit.mutationOptions({
      onSuccess: async () => {
        setSuccess('Encaissement soumis pour validation.')
        await queryClient.invalidateQueries({
          queryKey: orpc.collections.get.key({ input: { collectionId } }),
        })
      },
      onError: (err) => {
        setError(formatRpcError(err))
      },
    }),
  )

  const validate = useMutation(
    orpc.collections.validate.mutationOptions({
      onSuccess: async (data) => {
        setSuccess(
          `Encaissement validé. L'argent est enregistré en caisse (réf. ${data.movementId.slice(0, 8)}…).`,
        )
        await queryClient.invalidateQueries({
          queryKey: orpc.collections.get.key({ input: { collectionId } }),
        })
      },
      onError: (err) => {
        setError(formatRpcError(err))
      },
    }),
  )

  const reject = useMutation(
    orpc.collections.reject.mutationOptions({
      onSuccess: async () => {
        setSuccess('Encaissement rejeté — le livreur peut corriger et resoumettre.')
        setRejectReason('')
        await queryClient.invalidateQueries({
          queryKey: orpc.collections.get.key({ input: { collectionId } }),
        })
      },
      onError: (err) => {
        setError(formatRpcError(err))
      },
    }),
  )

  const isDirty = useMemo(() => {
    if (!collection.data || !draft) return false
    return (
      draft.cashAmount !== collection.data.cashAmount ||
      draft.cardAmount !== collection.data.cardAmount ||
      draft.mobileAmount !== collection.data.mobileAmount
    )
  }, [collection.data, draft])

  const totalCollected = useMemo(() => {
    if (!draft) return 0
    return draft.cashAmount + draft.cardAmount + draft.mobileAmount
  }, [draft])

  const variance = (collection.data?.expectedAmount ?? 0) - totalCollected

  const flushDraft = useCallback(async () => {
    if (!draft || !isDirty) return
    setSaveState('saving')
    try {
      await update.mutateAsync({
        collectionId,
        cashAmount: draft.cashAmount,
        cardAmount: draft.cardAmount,
        mobileAmount: draft.mobileAmount,
      })
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 1500)
    } catch {
      // onError handles message
    }
  }, [collectionId, draft, isDirty, update])

  useEffect(() => {
    if (!editable || !isDirty) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void flushDraft()
    }, 500)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [draft, editable, flushDraft, isDirty])

  async function handleSubmit() {
    setError(null)
    setSuccess(null)
    try {
      if (isDirty) await flushDraft()
      await submit.mutateAsync({ collectionId })
    } catch (err) {
      setError(formatRpcError(err))
    }
  }

  function updateDraft(patch: Partial<PaymentDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
    setSaveState('idle')
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-neutral-500">
            Encaissement
          </p>
          <h1 className="mt-1 text-3xl font-bold text-neutral-900">
            {collection.data?.employeeName ?? '…'}
          </h1>
          {collection.data ? (
            <p className="mt-2 text-sm text-neutral-600">
              {collection.data.date} · {collection.data.source} ·{' '}
              {formatStatus(collection.data.status)}
              {collection.data.status === 'validated'
                ? collection.data.isSettled
                  ? ' · Clôturé paie'
                  : ' · À clôturer'
                : ''}
            </p>
          ) : null}
        </div>
        <Link
          to="/collections"
          className="text-sm text-neutral-500 underline hover:text-neutral-800"
        >
          Retour
        </Link>
      </div>

      {collection.isLoading ? (
        <p className="mt-8 text-sm text-neutral-500">Chargement…</p>
      ) : collection.isError ? (
        <p className="mt-8 text-sm text-red-600">Encaissement introuvable.</p>
      ) : collection.data && draft ? (
        <>
          {editable ? (
            <p className="mt-4 text-sm text-neutral-500">
              {saveState === 'saving'
                ? 'Enregistrement…'
                : saveState === 'saved'
                  ? 'Modifications enregistrées'
                  : isDirty
                    ? 'Modifications en attente…'
                    : 'Saisissez les montants collectés'}
            </p>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </p>
          ) : null}

          <div className="mt-8 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-600">Montant attendu</span>
              <span className="font-medium text-neutral-900">
                {formatXof(collection.data.expectedAmount)}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {(
                [
                  ['cashAmount', 'Espèces'],
                  ['cardAmount', 'Carte'],
                  ['mobileAmount', 'Mobile'],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <label className="text-sm font-medium text-neutral-700">
                    {label}
                  </label>
                  {editable ? (
                    <input
                      type="number"
                      min={0}
                      value={draft[field]}
                      onChange={(e) =>
                        updateDraft({
                          [field]: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="text-sm text-neutral-800">
                      {formatXof(collection.data[field])}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Total collecté</span>
                <span className="font-medium text-neutral-900">
                  {formatXof(totalCollected)}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-neutral-600">Écart</span>
                <span
                  className={
                    variance === 0
                      ? 'text-emerald-700'
                      : variance > 0
                        ? 'text-amber-700'
                        : 'text-red-700'
                  }
                >
                  {formatXof(Math.abs(variance))}
                  {variance > 0 ? ' (manque)' : variance < 0 ? ' (excédent)' : ''}
                </span>
              </div>
            </div>
          </div>

          {editable ? (
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {isDirty ? (
                <button
                  type="button"
                  disabled={update.isPending}
                  onClick={() => void flushDraft()}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 disabled:opacity-50"
                >
                  {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              ) : null}
              <button
                type="button"
                disabled={submit.isPending || update.isPending}
                onClick={() => void handleSubmit()}
                className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submit.isPending ? 'Soumission…' : 'Soumettre'}
              </button>
            </div>
          ) : null}

          {reviewable && canManageCollections ? (
            <div className="mt-6 space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-900">
                Validation superviseur
              </p>
              <p className="text-sm text-amber-800">
                Vérifiez les montants reçus, puis validez pour enregistrer
                l'argent en caisse. Cette action est définitive.
              </p>
              <div className="space-y-2">
                <label
                  htmlFor="reject-reason"
                  className="text-sm font-medium text-neutral-700"
                >
                  Motif de rejet (optionnel)
                </label>
                <input
                  id="reject-reason"
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex. montants incohérents"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  disabled={
                    reject.isPending ||
                    validate.isPending ||
                    rejectReason.trim().length === 0
                  }
                  onClick={() =>
                    reject.mutate({
                      collectionId,
                      reason: rejectReason.trim(),
                    })
                  }
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-800 disabled:opacity-50"
                >
                  {reject.isPending ? 'Rejet…' : 'Rejeter'}
                </button>
                <button
                  type="button"
                  disabled={validate.isPending || reject.isPending}
                  onClick={() => validate.mutate({ collectionId })}
                  className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {validate.isPending ? 'Validation…' : 'Valider l’encaissement'}
                </button>
              </div>
            </div>
          ) : reviewable ? (
            <p className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
              Encaissement soumis — en attente de validation par un responsable.
            </p>
          ) : null}

          {collection.data.rejectionReason ? (
            <p className="mt-6 text-sm text-amber-800">
              Motif du rejet : {collection.data.rejectionReason}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
