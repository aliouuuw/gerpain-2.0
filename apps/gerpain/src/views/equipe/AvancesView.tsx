import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { Modal } from '#/components/ui/Modal'
import {
  advanceStatusLabel,
  installmentStatusLabel,
  repaymentMethodLabel,
} from '#/lib/advance-labels'
import { useBakery } from '#/lib/bakery-context'
import { formatXof, parseXofInput, xofInputToNumber } from '#/lib/format-money'
import { mutationError, mutationSuccess } from '#/lib/mutation-feedback'
import { orpc } from '#/lib/orpc-client'
import { useToast } from '#/lib/toast'
import { usePermissions } from '#/lib/use-permissions'

type AdvanceForm = {
  employeeId: string
  totalAmount: string
  installmentCount: string
  notes: string
  firstDuePeriod: string
}

const emptyAdvanceForm = (): AdvanceForm => ({
  employeeId: '',
  totalAmount: '',
  installmentCount: '3',
  notes: '',
  firstDuePeriod: '',
})

function statusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'warning'
  if (status === 'closed') return 'success'
  return 'neutral'
}

function formatGrantedAt(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function currentPeriod(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

export function AvancesView() {
  const { bakeryId } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'closed' | 'cancelled'
  >('active')
  const [addOpen, setAddOpen] = useState(false)
  const [detailAdvanceId, setDetailAdvanceId] = useState<string | null>(null)
  const [form, setForm] = useState<AdvanceForm>(emptyAdvanceForm)
  const [formError, setFormError] = useState<string | null>(null)

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const advances = useQuery({
    ...orpc.salaryAdvances.list.queryOptions({
      input: {
        bakeryId,
        status: statusFilter === 'all' ? undefined : statusFilter,
      },
    }),
    enabled: Boolean(bakeryId),
  })

  const activeEmployees = useMemo(
    () => (employees.data ?? []).filter((e) => e.status === 'active'),
    [employees.data],
  )

  const stats = useMemo(() => {
    const rows = advances.data ?? []
    const active = rows.filter((row) => row.status === 'active')
    const outstanding = active.reduce(
      (sum, row) => sum + row.remainingAmount,
      0,
    )
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const grantedThisMonth = rows.filter(
      (row) => new Date(row.grantedAt) >= monthStart,
    ).length
    return {
      activeCount: active.length,
      outstanding,
      grantedThisMonth,
      totalListed: rows.length,
    }
  }, [advances.data])

  const detailAdvance = useMemo(
    () => advances.data?.find((row) => row.id === detailAdvanceId) ?? null,
    [advances.data, detailAdvanceId],
  )

  const refetchAdvances = () => advances.refetch()

  const createAdvance = useMutation(
    orpc.salaryAdvances.create.mutationOptions({
      onSuccess: async () => {
        setForm(emptyAdvanceForm())
        setFormError(null)
        setAddOpen(false)
        mutationSuccess(toast, 'Avance enregistrée')()
        await refetchAdvances()
      },
      onError: (error) => {
        setFormError(error.message)
        mutationError(toast, 'Impossible d\'enregistrer l\'avance')(error)
      },
    }),
  )

  const payInstallment = useMutation(
    orpc.salaryAdvances.payInstallment.mutationOptions({
      onSuccess: () => {
        mutationSuccess(toast, 'Échéance enregistrée')()
        void refetchAdvances()
      },
      onError: mutationError(toast, 'Impossible d\'enregistrer le paiement'),
    }),
  )

  const payRemainder = useMutation(
    orpc.salaryAdvances.payRemainder.mutationOptions({
      onSuccess: () => {
        setDetailAdvanceId(null)
        mutationSuccess(toast, 'Avance soldée')()
        void refetchAdvances()
      },
      onError: mutationError(toast, 'Impossible de solder l\'avance'),
    }),
  )

  const rollOver = useMutation(
    orpc.salaryAdvances.rollOverInstallment.mutationOptions({
      onSuccess: () => {
        mutationSuccess(toast, 'Échéance reportée')()
        void refetchAdvances()
      },
      onError: mutationError(toast, 'Impossible de reporter l\'échéance'),
    }),
  )

  const cancelAdvance = useMutation(
    orpc.salaryAdvances.cancel.mutationOptions({
      onSuccess: () => {
        setDetailAdvanceId(null)
        mutationSuccess(toast, 'Avance annulée')()
        void refetchAdvances()
      },
      onError: mutationError(toast, 'Impossible d\'annuler l\'avance'),
    }),
  )

  function openAdd() {
    setForm({
      ...emptyAdvanceForm(),
      firstDuePeriod: currentPeriod(),
    })
    setFormError(null)
    setAddOpen(true)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!bakeryId || !form.employeeId) return

    const totalAmount = xofInputToNumber(form.totalAmount)
    const installmentCount = Number.parseInt(form.installmentCount, 10)

    if (totalAmount <= 0) {
      setFormError('Saisissez un montant valide')
      return
    }

    createAdvance.mutate({
      bakeryId,
      employeeId: form.employeeId,
      totalAmount,
      installmentCount,
      notes: form.notes.trim() || undefined,
      firstDuePeriod: form.firstDuePeriod.trim() || undefined,
    })
  }

  const isMutating =
    payInstallment.isPending ||
    payRemainder.isPending ||
    rollOver.isPending ||
    cancelAdvance.isPending

  return (
    <div className="section-stack">
      <HelpNote>
        Chaque avance est comptabilisée en caisse (Bocal). Les remboursements
        peuvent être en retenue sur paie ou en espèces. Reportez une échéance
        pour la fusionner avec la suivante.
      </HelpNote>

      <section className="stats-grid" aria-label="Indicateurs avances">
        <dl className="stats-grid__col">
          <div className="stats-lines__row">
            <dt>Avances en cours</dt>
            <dd>{stats.activeCount}</dd>
          </div>
        </dl>
        <dl className="stats-grid__col">
          <div className="stats-lines__row">
            <dt>Solde à recouvrer</dt>
            <dd>{formatXof(stats.outstanding)}</dd>
          </div>
        </dl>
        <dl className="stats-grid__col">
          <div className="stats-lines__row">
            <dt>Octroyées ce mois</dt>
            <dd>{stats.grantedThisMonth}</dd>
          </div>
        </dl>
        <dl className="stats-grid__col">
          <div className="stats-lines__row">
            <dt>Liste (filtre)</dt>
            <dd>{stats.totalListed}</dd>
          </div>
        </dl>
      </section>

      <Card
        title="Avances sur salaire"
        actions={
          canManage ? (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={openAdd}
            >
              <Plus size={16} aria-hidden="true" />
              Nouvelle avance
            </button>
          ) : undefined
        }
      >
        <div className="data-table-toolbar">
          <label className="data-table-toolbar__filter">
            <span>Statut</span>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as typeof statusFilter)
              }
            >
              <option value="all">Tous</option>
              <option value="active">En cours</option>
              <option value="closed">Soldées</option>
              <option value="cancelled">Annulées</option>
            </select>
          </label>
        </div>

        {advances.isLoading ? (
          <p className="settings-form__hint">Chargement…</p>
        ) : (advances.data?.length ?? 0) === 0 ? (
          <p className="settings-form__hint">
            Aucune avance pour ce filtre.
            {canManage ? ' Enregistrez une avance versée en caisse.' : ''}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Octroyée</th>
                  <th>Montant</th>
                  <th>Reste dû</th>
                  <th>Échéances</th>
                  <th>Statut</th>
                  <th aria-label="Détail" />
                </tr>
              </thead>
              <tbody>
                {advances.data?.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link
                        to="/equipe/agents/$employeeId"
                        params={{ employeeId: row.employeeId }}
                        className="text-link"
                      >
                        {row.employeeName}
                      </Link>
                    </td>
                    <td>{formatGrantedAt(row.grantedAt)}</td>
                    <td>{formatXof(row.totalAmount)}</td>
                    <td>{formatXof(row.remainingAmount)}</td>
                    <td>
                      {row.paidInstallments}/{row.installmentCount}
                    </td>
                    <td>
                      <Badge variant={statusBadgeVariant(row.status)}>
                        {advanceStatusLabel(row.status)}
                      </Badge>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => setDetailAdvanceId(row.id)}
                        aria-label={`Détail avance ${row.employeeName}`}
                      >
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Nouvelle avance sur salaire"
      >
        <form className="settings-form" onSubmit={handleCreate}>
          <label className="settings-form__field">
            <span>Agent</span>
            <select
              required
              value={form.employeeId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, employeeId: e.target.value }))
              }
            >
              <option value="">Sélectionner…</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-form__field">
            <span>Montant (XOF)</span>
            <input
              required
              inputMode="numeric"
              value={form.totalAmount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  totalAmount: parseXofInput(e.target.value),
                }))
              }
              placeholder="Ex. 50 000"
            />
          </label>

          <label className="settings-form__field">
            <span>Nombre d&apos;échéances</span>
            <input
              required
              type="number"
              min={1}
              max={24}
              value={form.installmentCount}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  installmentCount: e.target.value,
                }))
              }
            />
          </label>

          <label className="settings-form__field">
            <span>Première période (AAAA-MM, optionnel)</span>
            <input
              value={form.firstDuePeriod}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  firstDuePeriod: e.target.value,
                }))
              }
              placeholder="2026-06"
              pattern="\d{4}-\d{2}"
            />
          </label>

          <label className="settings-form__field settings-form__field--wide">
            <span>Notes (optionnel)</span>
            <textarea
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={2}
              maxLength={500}
            />
          </label>

          {formError ? (
            <p className="settings-form__error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="settings-form__actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setAddOpen(false)}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createAdvance.isPending}
            >
              {createAdvance.isPending ? 'Enregistrement…' : 'Verser l\'avance'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailAdvance !== null}
        onClose={() => setDetailAdvanceId(null)}
        title={
          detailAdvance
            ? `Avance — ${detailAdvance.employeeName}`
            : 'Détail avance'
        }
      >
        {detailAdvance ? (
          <div className="section-stack">
            <dl className="stats-lines">
              <div className="stats-lines__row">
                <dt>Montant total</dt>
                <dd>{formatXof(detailAdvance.totalAmount)}</dd>
              </div>
              <div className="stats-lines__row">
                <dt>Reste dû</dt>
                <dd>{formatXof(detailAdvance.remainingAmount)}</dd>
              </div>
              <div className="stats-lines__row">
                <dt>Statut</dt>
                <dd>{advanceStatusLabel(detailAdvance.status)}</dd>
              </div>
              {detailAdvance.notes ? (
                <div className="stats-lines__row">
                  <dt>Notes</dt>
                  <dd>{detailAdvance.notes}</dd>
                </div>
              ) : null}
            </dl>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Montant</th>
                    <th>Période</th>
                    <th>Statut</th>
                    {canManage ? <th aria-label="Actions" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {detailAdvance.installments.map((installment) => (
                    <tr key={installment.id}>
                      <td>{installment.installmentNumber}</td>
                      <td>{formatXof(installment.amount)}</td>
                      <td>{installment.duePeriod ?? '—'}</td>
                      <td>
                        {installmentStatusLabel(installment.status)}
                        {installment.paymentMethod
                          ? ` (${repaymentMethodLabel(installment.paymentMethod)})`
                          : ''}
                      </td>
                      {canManage && detailAdvance.status === 'active' ? (
                        <td className="table-actions">
                          {installment.status === 'scheduled' ? (
                            <>
                              <button
                                type="button"
                                className="table-action table-action--primary"
                                disabled={isMutating}
                                onClick={() =>
                                  payInstallment.mutate({
                                    bakeryId,
                                    installmentId: installment.id,
                                    method: 'payroll_deduction',
                                  })
                                }
                              >
                                Retenue paie
                              </button>
                              <button
                                type="button"
                                className="table-action"
                                disabled={isMutating}
                                onClick={() =>
                                  payInstallment.mutate({
                                    bakeryId,
                                    installmentId: installment.id,
                                    method: 'cash',
                                  })
                                }
                              >
                                Espèces
                              </button>
                              <button
                                type="button"
                                className="table-action"
                                disabled={isMutating}
                                onClick={() =>
                                  rollOver.mutate({
                                    bakeryId,
                                    installmentId: installment.id,
                                  })
                                }
                              >
                                Reporter
                              </button>
                            </>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canManage && detailAdvance.status === 'active' ? (
              <div className="settings-form__actions">
                {detailAdvance.remainingAmount > 0 ? (
                  <>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={isMutating}
                      onClick={() =>
                        payRemainder.mutate({
                          bakeryId,
                          advanceId: detailAdvance.id,
                          method: 'payroll_deduction',
                        })
                      }
                    >
                      Solder (retenue paie)
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={isMutating}
                      onClick={() =>
                        payRemainder.mutate({
                          bakeryId,
                          advanceId: detailAdvance.id,
                          method: 'cash',
                        })
                      }
                    >
                      Solder (espèces)
                    </button>
                  </>
                ) : null}
                {detailAdvance.paidInstallments === 0 ? (
                  <button
                    type="button"
                    className="btn-danger btn-sm"
                    disabled={isMutating}
                    onClick={() =>
                      cancelAdvance.mutate({
                        bakeryId,
                        advanceId: detailAdvance.id,
                      })
                    }
                  >
                    Annuler l&apos;avance
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
