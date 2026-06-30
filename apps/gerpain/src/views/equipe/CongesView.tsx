import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { Modal } from '#/components/ui/Modal'
import { useBakery } from '#/lib/bakery-context'
import { leaveStatusLabel, leaveTypeLabel } from '#/lib/leave-labels'
import { orpc } from '#/lib/orpc-client'
import { todayIso } from '#/lib/today'
import { usePermissions } from '#/lib/use-permissions'

type LeaveForm = {
  employeeId: string
  startDate: string
  endDate: string
  type: 'annual' | 'sick' | 'other'
  reason: string
}

const emptyLeaveForm = (startDate: string): LeaveForm => ({
  employeeId: '',
  startDate,
  endDate: startDate,
  type: 'annual',
  reason: '',
})

function statusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'neutral' {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

export function CongesView() {
  const today = todayIso()
  const { bakeryId } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'
  >('all')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState<LeaveForm>(() => emptyLeaveForm(today))
  const [formError, setFormError] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const leaves = useQuery({
    ...orpc.leaveRequests.list.queryOptions({
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
    const rows = leaves.data ?? []
    const onLeaveToday = rows.filter(
      (row) =>
        row.status === 'approved' &&
        row.startDate <= today &&
        row.endDate >= today,
    )
    return {
      pending: rows.filter((row) => row.status === 'pending').length,
      onLeaveToday: onLeaveToday.length,
      approved: rows.filter((row) => row.status === 'approved').length,
    }
  }, [leaves.data, today])

  const createLeave = useMutation(
    orpc.leaveRequests.create.mutationOptions({
      onSuccess: async () => {
        setForm(emptyLeaveForm(today))
        setFormError(null)
        setAddOpen(false)
        await leaves.refetch()
      },
      onError: (error) => setFormError(error.message),
    }),
  )

  const approveLeave = useMutation(
    orpc.leaveRequests.approve.mutationOptions({
      onSuccess: () => {
        setReviewNote('')
        void leaves.refetch()
      },
    }),
  )

  const rejectLeave = useMutation(
    orpc.leaveRequests.reject.mutationOptions({
      onSuccess: () => {
        setReviewNote('')
        void leaves.refetch()
      },
    }),
  )

  const cancelLeave = useMutation(
    orpc.leaveRequests.cancel.mutationOptions({
      onSuccess: () => leaves.refetch(),
    }),
  )

  function openAdd() {
    setForm(emptyLeaveForm(today))
    setFormError(null)
    setAddOpen(true)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!bakeryId || !form.employeeId) return

    createLeave.mutate({
      bakeryId,
      employeeId: form.employeeId,
      startDate: form.startDate,
      endDate: form.endDate,
      type: form.type,
      reason: form.reason.trim() || undefined,
    })
  }

  return (
    <div className="section-stack">
      <HelpNote>
        Les congés approuvés excluent automatiquement l&apos;agent des tournées
        préparées sur les dates concernées. Validez ou rejetez les demandes en
        attente ci-dessous.
      </HelpNote>

      <section className="stats-grid" aria-label="Indicateurs congés">
        <dl className="stats-grid__col">
          <div className="stats-lines__row">
            <dt>En attente</dt>
            <dd>{stats.pending}</dd>
          </div>
        </dl>
        <dl className="stats-grid__col">
          <div className="stats-lines__row">
            <dt>Absents aujourd&apos;hui</dt>
            <dd>{stats.onLeaveToday}</dd>
          </div>
        </dl>
        <dl className="stats-grid__col">
          <div className="stats-lines__row">
            <dt>Approuvés (filtre)</dt>
            <dd>{stats.approved}</dd>
          </div>
        </dl>
      </section>

      <Card
        title="Demandes de congé"
        actions={
          canManage ? (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={openAdd}
            >
              <Plus size={16} aria-hidden="true" />
              Nouvelle demande
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
                setStatusFilter(
                  e.target.value as typeof statusFilter,
                )
              }
            >
              <option value="all">Tous</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuvés</option>
              <option value="rejected">Rejetés</option>
              <option value="cancelled">Annulés</option>
            </select>
          </label>
        </div>

        {leaves.isLoading ? (
          <p className="settings-form__hint">Chargement…</p>
        ) : (leaves.data?.length ?? 0) === 0 ? (
          <p className="settings-form__hint">
            Aucune demande pour ce filtre.
            {canManage ? ' Créez une demande pour planifier une absence.' : ''}
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Type</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Statut</th>
                  <th>Motif</th>
                  {canManage ? <th aria-label="Actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {leaves.data?.map((row) => (
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
                    <td>{leaveTypeLabel(row.type)}</td>
                    <td>{row.startDate}</td>
                    <td>{row.endDate}</td>
                    <td>
                      <Badge variant={statusBadgeVariant(row.status)}>
                        {leaveStatusLabel(row.status)}
                      </Badge>
                    </td>
                    <td>{row.reason ?? '—'}</td>
                    {canManage ? (
                      <td className="table-actions">
                        {row.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              className="table-action table-action--primary"
                              disabled={approveLeave.isPending}
                              onClick={() =>
                                approveLeave.mutate({
                                  bakeryId,
                                  requestId: row.id,
                                  reviewNote: reviewNote.trim() || undefined,
                                })
                              }
                            >
                              Approuver
                            </button>
                            <button
                              type="button"
                              className="table-action"
                              disabled={rejectLeave.isPending}
                              onClick={() =>
                                rejectLeave.mutate({
                                  bakeryId,
                                  requestId: row.id,
                                  reviewNote: reviewNote.trim() || undefined,
                                })
                              }
                            >
                              Rejeter
                            </button>
                          </>
                        ) : null}
                        {row.status === 'pending' ||
                        row.status === 'approved' ? (
                          <button
                            type="button"
                            className="table-action"
                            disabled={cancelLeave.isPending}
                            onClick={() =>
                              cancelLeave.mutate({
                                bakeryId,
                                requestId: row.id,
                              })
                            }
                          >
                            Annuler
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canManage ? (
          <label className="settings-form__field settings-form__field--wide leave-review-note">
            <span>Note de validation (optionnelle, pour approuver / rejeter)</span>
            <input
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Ex. congé validé par le responsable"
            />
          </label>
        ) : null}
      </Card>

      <Modal
        open={addOpen}
        title="Nouvelle demande de congé"
        description="L'agent sera exclu des tournées une fois la demande approuvée."
        onClose={() => setAddOpen(false)}
        footer={
          <>
            <button
              type="button"
              className="table-action"
              disabled={createLeave.isPending}
              onClick={() => setAddOpen(false)}
            >
              Annuler
            </button>
            <button
              type="submit"
              form="leave-request-form"
              className="btn-primary btn-sm"
              disabled={createLeave.isPending}
            >
              {createLeave.isPending ? 'Enregistrement…' : 'Créer la demande'}
            </button>
          </>
        }
      >
        <form
          id="leave-request-form"
          className="settings-form settings-form--flush"
          onSubmit={(e) => void handleCreate(e)}
        >
          <div className="settings-form__grid">
            <label className="settings-form__field settings-form__field--wide">
              <span>Agent</span>
              <select
                value={form.employeeId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, employeeId: e.target.value }))
                }
                required
              >
                <option value="">Choisir…</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-form__field">
              <span>Type</span>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    type: e.target.value as LeaveForm['type'],
                  }))
                }
              >
                <option value="annual">Congé</option>
                <option value="sick">Maladie</option>
                <option value="other">Autre</option>
              </select>
            </label>
            <label className="settings-form__field">
              <span>Date de début</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    startDate: e.target.value,
                    endDate:
                      f.endDate < e.target.value ? e.target.value : f.endDate,
                  }))
                }
                required
              />
            </label>
            <label className="settings-form__field">
              <span>Date de fin</span>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endDate: e.target.value }))
                }
                required
              />
            </label>
            <label className="settings-form__field settings-form__field--wide">
              <span>Motif (optionnel)</span>
              <input
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="Ex. congé annuel"
              />
            </label>
          </div>
          {formError ? (
            <p className="settings-form__error">{formError}</p>
          ) : null}
        </form>
      </Modal>
    </div>
  )
}
