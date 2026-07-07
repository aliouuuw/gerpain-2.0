import { useMutation, useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { ConfirmDialog } from '#/components/ui/ConfirmDialog'
import { HelpNote } from '#/components/ui/HelpNote'
import { Modal } from '#/components/ui/Modal'
import { advanceStatusLabel } from '#/lib/advance-labels'
import { bonusStatusLabel, currentBonusPeriod } from '#/lib/bonus-labels'
import { useBakery } from '#/lib/bakery-context'
import {
  employeeInitials,
  employeeRoleLabel,
  employeeStatusLabel,
} from '#/lib/employee-labels'
import { formatXof, parseXofInput, xofInputToNumber } from '#/lib/format-money'
import { leaveStatusLabel, leaveTypeLabel } from '#/lib/leave-labels'
import { mutationError, mutationSuccess } from '#/lib/mutation-feedback'
import { orpc } from '#/lib/orpc-client'
import {
  formatPeriodLabel,
  periodBounds,
  presetLabel,
  type PeriodPreset,
} from '#/lib/period'
import { todayIso } from '#/lib/today'
import { useToast } from '#/lib/toast'
import { usePermissions } from '#/lib/use-permissions'

const routeApi = getRouteApi('/_shell/equipe/agents/$employeeId')

type FicheTab = 'profil' | 'remuneration' | 'primes' | 'avances' | 'conges' | 'activite'

const FICHE_TABS: Array<{ id: FicheTab; label: string }> = [
  { id: 'profil', label: 'Profil' },
  { id: 'remuneration', label: 'Rémunération' },
  { id: 'primes', label: 'Primes' },
  { id: 'avances', label: 'Avances' },
  { id: 'conges', label: 'Congés' },
  { id: 'activite', label: 'Activité' },
]

function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function collectionStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    submitted: 'Soumis',
    validated: 'Validé',
    rejected: 'Rejeté',
  }
  return labels[status] ?? status
}

function runStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    submitted: 'Soumis',
    validated: 'Validé',
    rejected: 'Rejeté',
  }
  return labels[status] ?? status
}

function soldeClass(solde: number): string {
  if (solde < 0) return 'money-strip__value--warn'
  if (solde > 0) return 'money-strip__value--info'
  return 'money-strip__value--ok'
}

function runSoldUnits(
  items: Array<{
    quantityEntrusted: number
    quantityReturned: number
  }>,
): number {
  return items.reduce(
    (sum, item) =>
      sum + Math.max(0, item.quantityEntrusted - item.quantityReturned),
    0,
  )
}

function runRevenue(
  items: Array<{
    quantityEntrusted: number
    quantityReturned: number
    unitPrice: number
  }>,
): number {
  return items.reduce((sum, item) => {
    const sold = Math.max(0, item.quantityEntrusted - item.quantityReturned)
    return sum + sold * item.unitPrice
  }, 0)
}

export function FicheAgentView() {
  const { employeeId } = routeApi.useParams()
  const search = routeApi.useSearch()
  const patchNavigate = routeApi.useNavigate()
  const { bakeryId } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const toast = useToast()
  const [addBonusOpen, setAddBonusOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [pendingCancelBonusId, setPendingCancelBonusId] = useState<string | null>(
    null,
  )
  const [bonusAmount, setBonusAmount] = useState('')
  const [bonusDuePeriod, setBonusDuePeriod] = useState(currentBonusPeriod())
  const [bonusReason, setBonusReason] = useState('')
  const [bonusFormError, setBonusFormError] = useState<string | null>(null)

  const tab: FicheTab = search.tab ?? 'activite'
  const preset: PeriodPreset = search.period ?? 'month'
  const customStart = search.start ?? todayIso()
  const customEnd = search.end ?? todayIso()

  const patchSearch = (patch: Partial<typeof search>) => {
    void patchNavigate({
      search: (prev) => ({ ...prev, ...patch }),
      replace: true,
    })
  }

  const { startDate, endDate } = useMemo(
    () => periodBounds(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  )

  const employee = useQuery({
    ...orpc.employees.get.queryOptions({
      input: { bakeryId, employeeId },
    }),
    enabled: Boolean(bakeryId && employeeId),
  })

  const locations = useQuery({
    ...orpc.locations.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const products = useQuery({
    ...orpc.employees.listProducts.queryOptions({
      input: { bakeryId, employeeId },
    }),
    enabled: Boolean(bakeryId && employeeId),
  })

  const collections = useQuery({
    ...orpc.collections.list.queryOptions({
      input: {
        bakeryId,
        employeeId,
        startDate,
        endDate,
      },
    }),
    enabled: Boolean(bakeryId && employeeId),
  })

  const runs = useQuery({
    ...orpc.deliveries.listRuns.queryOptions({
      input: {
        bakeryId,
        employeeId,
        startDate,
        endDate,
      },
    }),
    enabled: Boolean(bakeryId && employeeId),
  })

  const periodCommission = useQuery({
    ...orpc.employees.periodCommissions.queryOptions({
      input: {
        bakeryId,
        employeeId,
        startDate,
        endDate,
      },
    }),
    enabled: Boolean(bakeryId && employeeId && tab === 'activite'),
  })

  const periodCommissionBreakdown = useQuery({
    ...orpc.employees.periodCommissionBreakdown.queryOptions({
      input: {
        bakeryId,
        employeeId,
        startDate,
        endDate,
      },
    }),
    enabled: Boolean(bakeryId && employeeId && tab === 'activite'),
  })

  const advances = useQuery({
    ...orpc.salaryAdvances.list.queryOptions({
      input: { bakeryId, employeeId },
    }),
    enabled: Boolean(bakeryId && employeeId && tab === 'avances'),
  })

  const leaves = useQuery({
    ...orpc.leaveRequests.list.queryOptions({
      input: { bakeryId, employeeId },
    }),
    enabled: Boolean(bakeryId && employeeId && tab === 'conges'),
  })

  const bonuses = useQuery({
    ...orpc.salaryBonuses.list.queryOptions({
      input: { bakeryId, employeeId },
    }),
    enabled: Boolean(bakeryId && employeeId && tab === 'primes'),
  })

  const createBonus = useMutation(
    orpc.salaryBonuses.create.mutationOptions({
      onSuccess: async () => {
        setBonusAmount('')
        setBonusReason('')
        setBonusDuePeriod(currentBonusPeriod())
        setAddBonusOpen(false)
        mutationSuccess(toast, 'Prime enregistrée')()
        await bonuses.refetch()
      },
      onError: mutationError(toast, 'Impossible d\'enregistrer la prime'),
    }),
  )

  const cancelBonus = useMutation(
    orpc.salaryBonuses.cancel.mutationOptions({
      onSuccess: async () => {
        setPendingCancelBonusId(null)
        mutationSuccess(toast, 'Prime annulée')()
        await bonuses.refetch()
      },
      onError: mutationError(toast, 'Impossible d\'annuler la prime'),
    }),
  )

  const archiveEmployee = useMutation(
    orpc.employees.archive.mutationOptions({
      onSuccess: async () => {
        setArchiveOpen(false)
        mutationSuccess(toast, 'Agent archivé')()
        await employee.refetch()
      },
      onError: mutationError(toast, 'Impossible d\'archiver l\'agent'),
    }),
  )

  const reactivateEmployee = useMutation(
    orpc.employees.reactivate.mutationOptions({
      onSuccess: async () => {
        mutationSuccess(toast, 'Agent réactivé')()
        await employee.refetch()
      },
      onError: mutationError(toast, 'Impossible de réactiver l\'agent'),
    }),
  )

  function handleCreateBonus() {
    setBonusFormError(null)
    const parsedAmount = xofInputToNumber(parseXofInput(bonusAmount))
    if (!parsedAmount || parsedAmount <= 0) {
      setBonusFormError('Montant invalide.')
      return
    }
    if (!/^\d{4}-\d{2}$/.test(bonusDuePeriod)) {
      setBonusFormError('Période due invalide (AAAA-MM).')
      return
    }
    createBonus.mutate({
      bakeryId,
      employeeId,
      amount: parsedAmount,
      duePeriod: bonusDuePeriod,
      reason: bonusReason.trim() || undefined,
    })
  }

  const locationNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const location of locations.data ?? []) {
      map.set(location.id, location.name)
    }
    return map
  }, [locations.data])

  const periodStats = useMemo(() => {
    const collectionRows = collections.data ?? []
    const runRows = runs.data ?? []
    const totalExpected = collectionRows.reduce(
      (sum, row) => sum + row.expectedAmount,
      0,
    )
    const totalCollected = collectionRows.reduce(
      (sum, row) => sum + (row.actualAmount ?? 0),
      0,
    )
    const validatedRuns = runRows.filter((r) => r.status === 'validated')
    const revenue = runRows.reduce((sum, run) => sum + runRevenue(run.items), 0)
    const commissionRow = periodCommission.data?.[0]
    const breakdownRows = periodCommissionBreakdown.data ?? []
    const unitsCommissioned = breakdownRows.reduce(
      (sum, row) => (row.commissionPerUnit > 0 ? sum + row.unitsSold : sum),
      0,
    )

    return {
      tournees: runRows.length,
      validatedTournees: commissionRow?.validatedRuns ?? validatedRuns.length,
      encaissements: collectionRows.length,
      totalExpected,
      totalCollected,
      solde: totalCollected - totalExpected,
      unitsSold: commissionRow?.unitsSold ?? 0,
      unitsCommissioned,
      revenue,
      commissionDue: commissionRow?.commissionDue ?? 0,
      unsettled: collectionRows.filter(
        (r) => r.status === 'validated' && !r.isSettled,
      ).length,
    }
  }, [collections.data, runs.data, periodCommission.data, periodCommissionBreakdown.data])

  const activeAssignments = useMemo(
    () => (products.data ?? []).filter((p) => p.isActive !== false),
    [products.data],
  )

  const commissionedProductCount = useMemo(
    () =>
      activeAssignments.filter((row) => row.commissionPerUnit > 0).length,
    [activeAssignments],
  )

  if (employee.isLoading) {
    return <p className="settings-form__hint">Chargement de la fiche…</p>
  }

  if (employee.isError || !employee.data) {
    return (
      <div className="empty-state empty-state--action">
        <p className="empty-state__title">Agent introuvable</p>
        <Link to="/equipe/annuaire" className="text-link">
          ← Retour à l&apos;annuaire
        </Link>
      </div>
    )
  }

  const agent = employee.data
  const locationLabels = agent.locationIds
    .map((id) => locationNameById.get(id) ?? id)
    .join(', ')

  return (
    <div className="section-stack">
      <div className="fiche-back">
        <Link to="/equipe/annuaire" className="text-link">
          ← Effectif
        </Link>
      </div>

      <header className="agent-hero">
        <div className="avatar agent-avatar-lg">
          {employeeInitials(agent.firstName, agent.lastName)}
        </div>
        <div className="agent-hero__info">
          <h1 className="agent-hero__name">{agent.fullName}</h1>
          <div className="agent-hero__meta">
            <Badge variant="neutral">{employeeRoleLabel(agent.role)}</Badge>
            {agent.status === 'inactive' ? (
              <Badge variant="warning">{employeeStatusLabel('inactive')}</Badge>
            ) : (
              <Badge variant="success">{employeeStatusLabel('active')}</Badge>
            )}
          </div>
          <p className="agent-hero__contact">
            {agent.phone ?? 'Pas de téléphone'}
            {agent.email ? ` · ${agent.email}` : ''}
          </p>
        </div>
        <div className="agent-hero__actions">
          <Link
            to="/equipe/remuneration"
            search={{ employee: agent.id }}
            className="table-action"
          >
            Rémunération
          </Link>
          <Link
            to="/encaissements"
            search={{ employee: agent.id, period: preset }}
            className="table-action"
          >
            Encaissements
          </Link>
          {canManage ? (
            agent.status === 'active' ? (
              <button
                type="button"
                className="table-action table-action--danger"
                onClick={() => setArchiveOpen(true)}
              >
                Archiver
              </button>
            ) : (
              <button
                type="button"
                className="table-action table-action--primary"
                disabled={reactivateEmployee.isPending}
                onClick={() =>
                  reactivateEmployee.mutate({ bakeryId, employeeId: agent.id })
                }
              >
                {reactivateEmployee.isPending ? 'Réactivation…' : 'Réactiver'}
              </button>
            )
          ) : null}
        </div>
      </header>

      <nav className="fiche-tabs" aria-label="Sections fiche agent">
        {FICHE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`fiche-tabs__tab${tab === t.id ? ' fiche-tabs__tab--active' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => patchSearch({ tab: t.id })}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'profil' ? (
        <Card title="Identité">
          <dl className="fiche-details">
            <div className="fiche-details__row">
              <dt>Rôle</dt>
              <dd>{employeeRoleLabel(agent.role)}</dd>
            </div>
            <div className="fiche-details__row">
              <dt>Téléphone</dt>
              <dd>{agent.phone ?? '—'}</dd>
            </div>
            <div className="fiche-details__row">
              <dt>Email</dt>
              <dd>{agent.email ?? '—'}</dd>
            </div>
            <div className="fiche-details__row">
              <dt>Lieux</dt>
              <dd>{locationLabels || '—'}</dd>
            </div>
            <div className="fiche-details__row">
              <dt>Embauche</dt>
              <dd>{agent.hireDate ?? '—'}</dd>
            </div>
            <div className="fiche-details__row">
              <dt>Ordre tournées</dt>
              <dd>{agent.sortOrder != null ? agent.sortOrder + 1 : '—'}</dd>
            </div>
          </dl>
        </Card>
      ) : null}

      {tab === 'remuneration' ? (
        <>
          <Card
            title="Rémunération"
            actions={
              <Link
                to="/equipe/remuneration"
                search={{ employee: agent.id }}
                className="btn-secondary btn-sm"
              >
                Modifier
              </Link>
            }
          >
            <dl className="fiche-details">
              <div className="fiche-details__row">
                <dt>Salaire de base / mois</dt>
                <dd>{agent.baseSalary ? formatXof(agent.baseSalary) : '—'}</dd>
              </div>
              <div className="fiche-details__row">
                <dt>Produits assignés</dt>
                <dd>{activeAssignments.length}</dd>
              </div>
              {commissionedProductCount > 0 ? (
                <div className="fiche-details__row">
                  <dt>Produits commissionnés</dt>
                  <dd>
                    {commissionedProductCount} sur {activeAssignments.length}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card title="Produits & commissions">
            {products.isLoading ? (
              <p className="settings-form__hint">Chargement…</p>
            ) : activeAssignments.length === 0 ? (
              <p className="settings-form__hint">
                Aucun produit assigné.{' '}
                <Link
                  to="/equipe/remuneration"
                  search={{ employee: agent.id }}
                  className="text-link"
                >
                  Configurer
                </Link>
              </p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th className="num">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeAssignments.map((row) => (
                      <tr key={row.id}>
                        <td>{row.productName}</td>
                        <td className="num">
                          {formatXof(row.commissionPerUnit)} / u
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}

      {tab === 'primes' ? (
        <>
          <HelpNote>
            Les primes sont versées à la clôture de paie lorsque la période due
            correspond au libellé de clôture. Consultez{' '}
            <Link to="/equipe/paie" className="text-link">
              Paie
            </Link>
            .
          </HelpNote>
          <Card
            title="Primes"
            actions={
              canManage ? (
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => setAddBonusOpen(true)}
                >
                  <Plus size={14} aria-hidden="true" /> Nouvelle prime
                </button>
              ) : undefined
            }
          >
            {bonuses.isLoading ? (
              <p className="settings-form__hint">Chargement…</p>
            ) : (bonuses.data?.length ?? 0) === 0 ? (
              <p className="settings-form__hint">
                Aucune prime pour cet agent.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
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
                                onClick={() => setPendingCancelBonusId(row.id)}
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
              <p className="settings-form__error">
                {cancelBonus.error.message}
              </p>
            ) : null}
          </Card>

          <Modal
            open={addBonusOpen}
            title="Nouvelle prime"
            onClose={() => setAddBonusOpen(false)}
          >
            <div className="settings-form">
              <label className="settings-form__field">
                <span>Montant (XOF)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(e.target.value)}
                />
              </label>
              <label className="settings-form__field">
                <span>Période due (AAAA-MM)</span>
                <input
                  type="text"
                  value={bonusDuePeriod}
                  onChange={(e) => setBonusDuePeriod(e.target.value)}
                  placeholder="2026-07"
                />
              </label>
              <label className="settings-form__field">
                <span>Motif (optionnel)</span>
                <input
                  type="text"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                />
              </label>
              {bonusFormError ? (
                <p className="settings-form__error">{bonusFormError}</p>
              ) : null}
              {createBonus.isError ? (
                <p className="settings-form__error">
                  {createBonus.error.message}
                </p>
              ) : null}
              <div className="settings-form__actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={createBonus.isPending}
                  onClick={handleCreateBonus}
                >
                  {createBonus.isPending ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </Modal>
        </>
      ) : null}

      {tab === 'avances' ? (
        <Card
          title="Avances sur salaire"
          actions={
            <Link
              to="/equipe/avances"
              className="btn-secondary btn-sm"
            >
              Gérer
            </Link>
          }
        >
          {advances.isLoading ? (
            <p className="settings-form__hint">Chargement…</p>
          ) : (advances.data?.length ?? 0) === 0 ? (
            <p className="settings-form__hint">
              Aucune avance pour cet agent.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Octroyée</th>
                    <th className="num">Montant</th>
                    <th className="num">Reste dû</th>
                    <th className="num">Échéances</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.data?.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.grantedAt)}</td>
                      <td className="num">{formatXof(row.totalAmount)}</td>
                      <td className="num">{formatXof(row.remainingAmount)}</td>
                      <td className="num">
                        {row.paidInstallments}/{row.installmentCount}
                      </td>
                      <td>{advanceStatusLabel(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'conges' ? (
        <Card
          title="Congés et absences"
          actions={
            <Link to="/equipe/conges" className="btn-secondary btn-sm">
              Gérer
            </Link>
          }
        >
          {leaves.isLoading ? (
            <p className="settings-form__hint">Chargement…</p>
          ) : (leaves.data?.length ?? 0) === 0 ? (
            <p className="settings-form__hint">
              Aucune demande de congé pour cet agent.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Début</th>
                    <th>Fin</th>
                    <th>Statut</th>
                    <th>Motif</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.data?.map((row) => (
                    <tr key={row.id}>
                      <td>{leaveTypeLabel(row.type)}</td>
                      <td>{row.startDate}</td>
                      <td>{row.endDate}</td>
                      <td>{leaveStatusLabel(row.status)}</td>
                      <td>{row.reason ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'activite' ? (
        <>
          <section className="period-toolbar" aria-label="Période fiche agent">
            <div className="period-toolbar__group">
              <span className="period-toolbar__label">Période</span>
              <div className="period-toolbar__presets">
                {(['week', 'month', 'last15', 'custom'] as PeriodPreset[]).map(
                  (p) => (
                    <button
                      key={p}
                      type="button"
                      className={`preset-btn${preset === p ? ' preset-btn--active' : ''}`}
                      onClick={() => patchSearch({ period: p })}
                    >
                      {presetLabel(p)}
                    </button>
                  ),
                )}
              </div>
            </div>
            {preset === 'custom' ? (
              <div className="period-toolbar__custom">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => patchSearch({ start: e.target.value })}
                />
                <span>→</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => patchSearch({ end: e.target.value })}
                />
              </div>
            ) : (
              <span className="period-toolbar__range">
                {formatPeriodLabel(startDate, endDate)}
              </span>
            )}
          </section>

          <section className="stats-grid" aria-label="Activité sur la période">
            <dl className="stats-grid__col">
              <div className="stats-lines__row">
                <dt>Tournées</dt>
                <dd>
                  {periodStats.tournees}
                  <span className="stats-lines__meta">
                    {periodStats.validatedTournees} validée
                    {periodStats.validatedTournees > 1 ? 's' : ''}
                  </span>
                </dd>
              </div>
              <div className="stats-lines__row">
                <dt>Unités vendues</dt>
                <dd>
                  {periodStats.unitsSold}
                  {periodStats.unitsSold > periodStats.unitsCommissioned ? (
                    <span className="stats-lines__meta">
                      dont {periodStats.unitsCommissioned} commissionnée
                      {periodStats.unitsCommissioned > 1 ? 's' : ''}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
            <dl className="stats-grid__col">
              <div className="stats-lines__row">
                <dt>CA tournées</dt>
                <dd>{formatXof(periodStats.revenue)}</dd>
              </div>
              <div className="stats-lines__row">
                <dt>Commission due</dt>
                <dd>
                  {formatXof(periodStats.commissionDue)}
                  <span className="stats-lines__meta">tournées validées</span>
                </dd>
              </div>
            </dl>
            <dl className="stats-grid__col">
              <div className="stats-lines__row">
                <dt>Encaissements</dt>
                <dd>
                  {periodStats.encaissements}
                  {periodStats.unsettled > 0 ? (
                    <span className="stats-lines__meta">
                      {periodStats.unsettled} à clôturer
                    </span>
                  ) : null}
                </dd>
              </div>
              <div className="stats-lines__row">
                <dt>Attendu / collecté</dt>
                <dd>
                  {formatXof(periodStats.totalCollected)}
                  <span className="stats-lines__meta">
                    sur {formatXof(periodStats.totalExpected)}
                  </span>
                </dd>
              </div>
            </dl>
            <dl className="stats-grid__col">
              <div className="stats-lines__row">
                <dt>Solde période</dt>
                <dd>
                  <span className={soldeClass(periodStats.solde)}>
                    {formatXof(Math.abs(periodStats.solde))}
                    {periodStats.solde > 0
                      ? ' (excédent)'
                      : periodStats.solde < 0
                        ? ' (manque)'
                        : ''}
                  </span>
                </dd>
              </div>
            </dl>
          </section>

          <HelpNote>
            La commission est calculée produit par produit (tournées validées).
            Le manque caisse sur la période est retenu sur la paie ; l&apos;excédent
            est informatif. Consultez{' '}
            <Link to="/equipe/paie" className="text-link">
              Paie
            </Link>{' '}
            pour le bulletin.
          </HelpNote>

          {(periodCommissionBreakdown.data?.length ?? 0) > 0 ? (
            <Card title="Détail commissions par produit">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produit</th>
                      <th className="num">Vendu</th>
                      <th className="num">Commission / u</th>
                      <th className="num">Sous-total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodCommissionBreakdown.data?.map((row) => (
                      <tr key={row.productId}>
                        <td>{row.productName}</td>
                        <td className="num">{row.unitsSold}</td>
                        <td className="num">
                          {formatXof(row.commissionPerUnit)}
                        </td>
                        <td className="num">{formatXof(row.commissionDue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          <Card title="Tournées sur la période">
            {runs.isLoading ? (
              <p className="settings-form__hint">Chargement…</p>
            ) : (runs.data?.length ?? 0) === 0 ? (
              <p className="settings-form__hint">
                Aucune tournée sur cette période.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Lieu</th>
                      <th>Statut</th>
                      <th className="num">Vendu</th>
                      <th className="num">CA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.data?.map((run) => (
                      <tr key={run.id}>
                        <td>{run.date}</td>
                        <td>{run.locationName}</td>
                        <td>{runStatusLabel(run.status)}</td>
                        <td className="num">{runSoldUnits(run.items)}</td>
                        <td className="num">
                          {formatXof(runRevenue(run.items))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Encaissements sur la période">
            {collections.isLoading ? (
              <p className="settings-form__hint">Chargement…</p>
            ) : (collections.data?.length ?? 0) === 0 ? (
              <p className="settings-form__hint">
                Aucun encaissement sur cette période.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Statut</th>
                      <th className="num">Attendu</th>
                      <th className="num">Collecté</th>
                      <th>Paie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.data?.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <Link
                            to="/collections/$collectionId"
                            params={{ collectionId: row.id }}
                            className="text-link"
                          >
                            {row.date}
                          </Link>
                        </td>
                        <td>{collectionStatusLabel(row.status)}</td>
                        <td className="num">{formatXof(row.expectedAmount)}</td>
                        <td className="num">
                          {formatXof(row.actualAmount ?? 0)}
                        </td>
                        <td>
                          {row.status === 'validated'
                            ? row.isSettled
                              ? 'Clôturé'
                              : 'À clôturer'
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}

      <ConfirmDialog
        open={archiveOpen}
        title="Archiver cet agent ?"
        confirmLabel="Archiver"
        confirmVariant="danger"
        loading={archiveEmployee.isPending}
        onConfirm={() => {
          if (!bakeryId) return
          archiveEmployee.mutate({ bakeryId, employeeId: agent.id })
        }}
        onCancel={() => setArchiveOpen(false)}
      >
        <p>
          {agent.fullName} ne sera plus proposé dans les listes actives. Son
          historique (tournées, paie, avances) reste consultable ici.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingCancelBonusId !== null}
        title="Annuler cette prime ?"
        confirmLabel="Annuler la prime"
        confirmVariant="danger"
        loading={cancelBonus.isPending}
        onConfirm={() => {
          if (!bakeryId || !pendingCancelBonusId) return
          cancelBonus.mutate({ bakeryId, bonusId: pendingCancelBonusId })
        }}
        onCancel={() => setPendingCancelBonusId(null)}
      >
        <p>Elle ne sera plus versée à la clôture de paie.</p>
      </ConfirmDialog>
    </div>
  )
}
