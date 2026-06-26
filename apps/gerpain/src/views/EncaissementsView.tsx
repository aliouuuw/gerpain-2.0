import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { HelpNote } from '#/components/ui/HelpNote'
import { useBakery } from '#/lib/bakery-context'
import { collectedAmount } from '#/lib/day-operations'
import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import {
  formatPeriodLabel,
  periodBounds,
  presetLabel,
  type PeriodPreset,
} from '#/lib/period'
import { usePermissions } from '#/lib/use-permissions'
import { formatDayShort } from '#/lib/shell-date'
import { todayIso } from '#/lib/today'

function formatCollectionStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    submitted: 'Soumis',
    validated: 'Validé',
    rejected: 'Rejeté',
  }
  return labels[status] ?? status
}

function collectionBadge(status: string) {
  const label = formatCollectionStatus(status)
  switch (status) {
    case 'validated':
      return <Badge variant="success">{label}</Badge>
    case 'submitted':
      return <Badge variant="warning">{label}</Badge>
    case 'pending':
      return <Badge variant="info">{label}</Badge>
    case 'rejected':
      return <Badge variant="danger">{label}</Badge>
    default:
      return <Badge variant="neutral">{label}</Badge>
  }
}

function varianceClass(variance: number): string {
  if (variance < 0) return 'text-warning'
  if (variance > 0) return 'text-success'
  return ''
}

function formatVariance(variance: number, collected: number): string {
  if (collected === 0) return '—'
  if (variance === 0) return '0 F'
  const sign = variance > 0 ? '+' : '−'
  return `${sign}${formatXof(Math.abs(variance))}`
}

function parseMoneyInput(value: string): number {
  const raw = value.replace(/\D/g, '')
  return raw === '' ? 0 : Number.parseInt(raw, 10)
}

function formatRpcError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'Une erreur est survenue.'
}

function MoneyInput({
  value,
  disabled,
  ariaLabel,
  onCommit,
}: {
  value: number
  disabled: boolean
  ariaLabel: string
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState(value === 0 ? '' : String(value))

  useEffect(() => {
    setDraft(value === 0 ? '' : String(value))
  }, [value])

  function commit() {
    const next = parseMoneyInput(draft)
    if (next !== value) {
      onCommit(next)
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      className="money-input"
      aria-label={ariaLabel}
      value={draft}
      placeholder="0"
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit()
          ;(e.target as HTMLInputElement).blur()
        }
      }}
    />
  )
}

export function EncaissementsView() {
  const queryClient = useQueryClient()
  const { bakeryId, isLoading: bakeryLoading } = useBakery()
  const { canManageCollections } = usePermissions()

  const [preset, setPreset] = useState<PeriodPreset>('week')
  const [customStart, setCustomStart] = useState(todayIso())
  const [customEnd, setCustomEnd] = useState(todayIso())
  const [employeeId, setEmployeeId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmCollectionId, setConfirmCollectionId] = useState<string | null>(null)
  const [pendingUpdateId, setPendingUpdateId] = useState<string | null>(null)

  const { startDate, endDate } = useMemo(
    () => periodBounds(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  )

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({
      input: { bakeryId, status: 'active' },
    }),
    enabled: Boolean(bakeryId),
  })

  const employeesReady = !employees.isLoading && employees.data

  const selectedEmployeeId = useMemo(() => {
    const list = employees.data ?? []
    if (employeeId && list.some((e) => e.id === employeeId)) return employeeId
    if (list.length > 0) return list[0].id
    return ''
  }, [employeeId, employees.data])

  const collections = useQuery({
    ...orpc.collections.list.queryOptions({
      input: {
        bakeryId,
        startDate,
        endDate,
        employeeId: selectedEmployeeId || undefined,
      },
    }),
    enabled: Boolean(bakeryId) && employeesReady && Boolean(selectedEmployeeId),
  })

  const update = useMutation(
    orpc.collections.update.mutationOptions({
      onMutate: ({ collectionId }) => {
        setPendingUpdateId(collectionId)
        setError(null)
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: orpc.collections.list.key(),
        })
      },
      onError: (err) => {
        setError(formatRpcError(err))
      },
      onSettled: () => {
        setPendingUpdateId(null)
      },
    }),
  )

  const submit = useMutation(
    orpc.collections.submit.mutationOptions({
      onMutate: () => setError(null),
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: orpc.collections.list.key(),
        })
      },
      onError: (err) => {
        setError(formatRpcError(err))
      },
    }),
  )

  const validate = useMutation(
    orpc.collections.validate.mutationOptions({
      onMutate: () => {
        setConfirmOpen(false)
        setConfirmCollectionId(null)
        setError(null)
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: orpc.collections.list.key(),
        })
      },
      onError: (err) => {
        setError(formatRpcError(err))
      },
    }),
  )

  useEffect(() => {
    setError(null)
  }, [preset, customStart, customEnd, selectedEmployeeId])

  const rows = useMemo(() => {
    const data = collections.data ?? []
    return [...data].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
  }, [collections.data])

  const stats = useMemo(() => {
    const expected = rows.reduce((sum, col) => sum + col.expectedAmount, 0)
    const collected = rows.reduce((sum, col) => sum + collectedAmount(col), 0)
    const balance = collected - expected
    const performance = expected > 0 ? Math.round((collected / expected) * 100) : 0
    return { expected, collected, balance, performance }
  }, [rows])

  const selectedEmployee = useMemo(
    () => employees.data?.find((e) => e.id === selectedEmployeeId),
    [employees.data, selectedEmployeeId],
  )

  function handleUpdateAmount(
    collectionId: string,
    field: 'cashAmount' | 'cardAmount' | 'mobileAmount',
    value: number,
  ) {
    void update.mutate({ collectionId, [field]: value })
  }

  function handleValidateRequest(collectionId: string) {
    setConfirmCollectionId(collectionId)
    setConfirmOpen(true)
  }

  function handleConfirmValidate() {
    if (!confirmCollectionId) return
    void validate.mutate({ collectionId: confirmCollectionId })
  }

  function isRowBusy(rowId: string) {
    return (
      submit.isPending ||
      validate.isPending ||
      pendingUpdateId === rowId
    )
  }

  const confirmRow = confirmCollectionId
    ? rows.find((row) => row.id === confirmCollectionId)
    : undefined

  return (
    <main className="page-content">
      <section className="period-toolbar" aria-label="Filtres période">
        <div className="period-toolbar__group">
          <span className="period-toolbar__label">Période</span>
          <div className="period-toolbar__presets">
            {(['week', 'month', 'last15', 'custom'] as PeriodPreset[]).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  className={`preset-btn ${preset === p ? 'preset-btn--active' : ''}`}
                  onClick={() => setPreset(p)}
                >
                  {presetLabel(p)}
                </button>
              ),
            )}
          </div>
          {preset === 'custom' && (
            <div className="period-toolbar__custom">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <span>à</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="period-toolbar__group">
          <span className="period-toolbar__label">Agent</span>
          <select
            className="employee-select"
            value={selectedEmployeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={employees.isLoading || employees.data?.length === 0}
          >
            {employees.isLoading ? (
              <option value="">Chargement…</option>
            ) : employees.data?.length === 0 ? (
              <option value="">Aucun agent actif</option>
            ) : (
              employees.data?.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))
            )}
          </select>
        </div>
      </section>

      <section className="money-strip" aria-label="Résumé période">
        <div className="money-strip__item">
          <span className="money-strip__label">Attendu</span>
          <span className="money-strip__value">{formatXof(stats.expected)}</span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Collecté</span>
          <span className="money-strip__value money-strip__value--ok">
            {formatXof(stats.collected)}
          </span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Solde</span>
          <span
            className={`money-strip__value ${
              stats.balance < 0
                ? 'money-strip__value--warn'
                : stats.balance > 0
                  ? 'money-strip__value--ok'
                  : ''
            }`}
          >
            {stats.balance === 0
              ? '0 F'
              : `${formatXof(Math.abs(stats.balance))} ${stats.balance < 0 ? '(manque)' : '(excédent)'}`}
          </span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Performance</span>
          <span className="money-strip__value">{stats.performance}%</span>
        </div>
      </section>

      <HelpNote>
        Période : {formatPeriodLabel(startDate, endDate)}
        {selectedEmployee ? ` — ${selectedEmployee.firstName} ${selectedEmployee.lastName}` : ''}
        . Saisissez les montants reçus, soumettez, puis validez.
      </HelpNote>

      {error ? (
        <p className="settings-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        {!bakeryId || bakeryLoading || employees.isLoading || collections.isLoading ? (
          <p className="empty-state">Chargement des encaissements…</p>
        ) : collections.isError ? (
          <p className="empty-state">Impossible de charger les encaissements.</p>
        ) : employees.data?.length === 0 ? (
          <p className="empty-state">
            Aucun agent actif pour cette boulangerie.
          </p>
        ) : rows.length === 0 ? (
          <p className="empty-state">
            Aucun encaissement pour cette période et cet agent.
          </p>
        ) : (
          <table className="data-table data-table--period">
            <thead>
              <tr>
                <th>Date</th>
                <th>Attendu</th>
                <th>Espèces</th>
                <th>Carte</th>
                <th>Mobile</th>
                <th>Collecté</th>
                <th>Écart</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const collected = collectedAmount(row)
                const variance = row.variance ?? collected - row.expectedAmount
                const editable =
                  row.status === 'pending' || row.status === 'rejected'
                const canSubmit = editable && collected > 0
                const canValidate = row.status === 'submitted'
                const busy = isRowBusy(row.id)

                return (
                  <tr key={row.id}>
                    <td>
                      <span className="cell-agent">{formatDayShort(row.date)}</span>
                      <span className="cell-sub">{row.source}</span>
                    </td>
                    <td className="cell-money">
                      {formatXof(row.expectedAmount)}
                    </td>
                    <td>
                      <MoneyInput
                        value={row.cashAmount}
                        ariaLabel="Espèces"
                        disabled={!editable || busy}
                        onCommit={(value) =>
                          handleUpdateAmount(row.id, 'cashAmount', value)
                        }
                      />
                    </td>
                    <td>
                      <MoneyInput
                        value={row.cardAmount}
                        ariaLabel="Carte"
                        disabled={!editable || busy}
                        onCommit={(value) =>
                          handleUpdateAmount(row.id, 'cardAmount', value)
                        }
                      />
                    </td>
                    <td>
                      <MoneyInput
                        value={row.mobileAmount}
                        ariaLabel="Mobile"
                        disabled={!editable || busy}
                        onCommit={(value) =>
                          handleUpdateAmount(row.id, 'mobileAmount', value)
                        }
                      />
                    </td>
                    <td className="cell-money">
                      {collected > 0 ? formatXof(collected) : '—'}
                    </td>
                    <td className={`cell-money ${varianceClass(variance)}`}>
                      {formatVariance(variance, collected)}
                    </td>
                    <td>{collectionBadge(row.status)}</td>
                    <td>
                      <div className="table-actions">
                        {canSubmit && (
                          <button
                            type="button"
                            className="table-action table-action--primary"
                            disabled={submit.isPending || validate.isPending}
                            onClick={() => void submit.mutate({ collectionId: row.id })}
                          >
                            Soumettre
                          </button>
                        )}
                        {canValidate && canManageCollections && (
                          <button
                            type="button"
                            className="table-action table-action--primary"
                            disabled={submit.isPending || validate.isPending}
                            onClick={() => handleValidateRequest(row.id)}
                          >
                            Valider
                          </button>
                        )}
                        <Link
                          to="/collections/$collectionId"
                          params={{ collectionId: row.id }}
                          className="table-action"
                        >
                          Voir
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Valider l'encaissement ?"
        confirmLabel="Valider"
        loading={validate.isPending}
        onCancel={() => {
          setConfirmOpen(false)
          setConfirmCollectionId(null)
        }}
        onConfirm={() => handleConfirmValidate()}
      >
        {confirmRow ? (
          <>
            <p>
              {confirmRow.employeeName} — {confirmRow.date}
            </p>
            <p>
              Montant collecté :{' '}
              <strong>
                {formatXof(collectedAmount(confirmRow))}
              </strong>
            </p>
            <p className="settings-form__hint">
              Cette action est définitive et enregistre l'argent en caisse.
            </p>
          </>
        ) : (
          <p>Encaissement introuvable.</p>
        )}
      </ConfirmDialog>
    </main>
  )
}
