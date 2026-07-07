import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { HelpNote } from '#/components/ui/HelpNote'
import { Modal } from '#/components/ui/Modal'
import { useBakery } from '#/lib/bakery-context'
import { formatXof, parseXofInput, xofInputToNumber } from '#/lib/format-money'
import { mutationError, mutationSuccess } from '#/lib/mutation-feedback'
import { orpc } from '#/lib/orpc-client'
import { useToast } from '#/lib/toast'
import { usePermissions } from '#/lib/use-permissions'

import { bonusStatusLabel, currentBonusPeriod } from '#/lib/bonus-labels'

export function BonusesView() {
  const { bakeryId } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const toast = useToast()
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'scheduled' | 'paid' | 'cancelled'
  >('scheduled')
  const [addOpen, setAddOpen] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [amount, setAmount] = useState('')
  const [duePeriod, setDuePeriod] = useState(currentBonusPeriod())
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const bonuses = useQuery({
    ...orpc.salaryBonuses.list.queryOptions({
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

  const createBonus = useMutation(
    orpc.salaryBonuses.create.mutationOptions({
      onSuccess: async () => {
        setEmployeeId('')
        setAmount('')
        setReason('')
        setDuePeriod(currentBonusPeriod())
        setAddOpen(false)
        mutationSuccess(toast, 'Prime enregistrée')()
        await bonuses.refetch()
      },
      onError: (error) => {
        setFormError(error.message)
        mutationError(toast, 'Impossible d\'enregistrer la prime')(error)
      },
    }),
  )

  const cancelBonus = useMutation(
    orpc.salaryBonuses.cancel.mutationOptions({
      onSuccess: async () => {
        setPendingCancelId(null)
        mutationSuccess(toast, 'Prime annulée')()
        await bonuses.refetch()
      },
      onError: mutationError(toast, 'Impossible d\'annuler la prime'),
    }),
  )

  function handleCreate() {
    setFormError(null)
    const parsedAmount = xofInputToNumber(parseXofInput(amount))
    if (!employeeId) {
      setFormError('Sélectionnez un agent.')
      return
    }
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError('Montant invalide.')
      return
    }
    if (!/^\d{4}-\d{2}$/.test(duePeriod)) {
      setFormError('Période due invalide (AAAA-MM).')
      return
    }
    createBonus.mutate({
      bakeryId,
      employeeId,
      amount: parsedAmount,
      duePeriod,
      reason: reason.trim() || undefined,
    })
  }

  return (
    <div className="section-stack">
      <HelpNote>
        Primes ponctuelles versées à la clôture de paie lorsque la période due
        correspond au libellé de clôture (ex. 2026-07). Consultez{' '}
        <Link to="/equipe/paie" className="text-link">
          Paie
        </Link>{' '}
        pour l&apos;aperçu.
      </HelpNote>

      <Card
        title="Primes"
        actions={
          canManage ? (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={14} aria-hidden="true" /> Nouvelle prime
            </button>
          ) : undefined
        }
      >
        <div className="period-toolbar" style={{ marginBottom: '1rem' }}>
          <div className="period-toolbar__presets">
            {(['scheduled', 'paid', 'cancelled', 'all'] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  className={`preset-btn${statusFilter === status ? ' preset-btn--active' : ''}`}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'Toutes' : bonusStatusLabel(status)}
                </button>
              ),
            )}
          </div>
        </div>

        {bonuses.isLoading ? (
          <p className="empty-state">Chargement…</p>
        ) : (bonuses.data?.length ?? 0) === 0 ? (
          <p className="empty-state">Aucune prime pour ce filtre.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Période due</th>
                  <th className="num">Montant</th>
                  <th>Statut</th>
                  <th>Motif</th>
                  {canManage ? <th aria-label="Actions" /> : null}
                </tr>
              </thead>
              <tbody>
                {bonuses.data?.map((row) => (
                  <tr key={row.id}>
                    <td>{row.employeeName}</td>
                    <td>{row.duePeriod}</td>
                    <td className="num">{formatXof(row.amount)}</td>
                    <td>
                      <Badge variant="neutral">
                        {bonusStatusLabel(row.status)}
                      </Badge>
                    </td>
                    <td>{row.reason ?? '—'}</td>
                    {canManage ? (
                      <td>
                        {row.status === 'scheduled' ? (
                          <button
                            type="button"
                            className="table-action table-action--danger"
                            disabled={cancelBonus.isPending}
                            onClick={() => setPendingCancelId(row.id)}
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
        {cancelBonus.isError ? (
          <p className="settings-form__error">{cancelBonus.error.message}</p>
        ) : null}
      </Card>

      <Modal
        open={addOpen}
        title="Nouvelle prime"
        onClose={() => setAddOpen(false)}
      >
        <div className="settings-form">
          <label className="settings-form__field">
            <span>Agent</span>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">— Choisir —</option>
              {activeEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName}
                </option>
              ))}
            </select>
          </label>
          <label className="settings-form__field">
            <span>Montant (XOF)</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="settings-form__field">
            <span>Période due (AAAA-MM)</span>
            <input
              type="text"
              value={duePeriod}
              onChange={(e) => setDuePeriod(e.target.value)}
              placeholder="2026-07"
            />
          </label>
          <label className="settings-form__field">
            <span>Motif (optionnel)</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {formError ? (
            <p className="settings-form__error">{formError}</p>
          ) : null}
          {createBonus.isError ? (
            <p className="settings-form__error">{createBonus.error.message}</p>
          ) : null}
          <div className="settings-form__actions">
            <button
              type="button"
              className="btn-primary"
              disabled={createBonus.isPending}
              onClick={handleCreate}
            >
              {createBonus.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingCancelId !== null}
        title="Annuler cette prime ?"
        confirmLabel="Annuler la prime"
        confirmVariant="danger"
        loading={cancelBonus.isPending}
        onConfirm={() => {
          if (!bakeryId || !pendingCancelId) return
          cancelBonus.mutate({ bakeryId, bonusId: pendingCancelId })
        }}
        onCancel={() => setPendingCancelId(null)}
      >
        <p>Elle ne sera plus versée à la clôture de paie.</p>
      </ConfirmDialog>
    </div>
  )
}
