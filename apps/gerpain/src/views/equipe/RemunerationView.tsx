import { useMutation, useQuery } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { useBakery } from '#/lib/bakery-context'
import {
  employeeInitials,
  employeeRoleLabel,
} from '#/lib/employee-labels'
import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import {
  formatPeriodLabel,
  periodBounds,
  presetLabel,
  type PeriodPreset,
} from '#/lib/period'
import { todayIso } from '#/lib/today'
import { usePermissions } from '#/lib/use-permissions'
import { AffectationsView } from '#/views/equipe/AffectationsView'

const routeApi = getRouteApi('/_shell/equipe/remuneration')

type PayDraft = {
  baseSalary: string
}

export function RemunerationView({
  employeeId,
}: {
  employeeId?: string
} = {}) {
  const { bakeryId } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const search = routeApi.useSearch()
  const patchNavigate = routeApi.useNavigate()
  const [drafts, setDrafts] = useState<Record<string, PayDraft>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

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

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const periodCommissions = useQuery({
    ...orpc.employees.periodCommissions.queryOptions({
      input: { bakeryId, startDate, endDate },
    }),
    enabled: Boolean(bakeryId),
  })

  const commissionByEmployee = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of periodCommissions.data ?? []) {
      map.set(row.employeeId, row.commissionDue)
    }
    return map
  }, [periodCommissions.data])

  const activeEmployees = useMemo(
    () => (employees.data ?? []).filter((e) => e.status === 'active'),
    [employees.data],
  )

  useEffect(() => {
    if (!employees.data) return
    const next: Record<string, PayDraft> = {}
    for (const employee of employees.data) {
      if (employee.status !== 'active') continue
      next[employee.id] = {
        baseSalary: String(employee.baseSalary ?? 0),
      }
    }
    setDrafts(next)
  }, [employees.data])

  const summary = useMemo(() => {
    const monthlyPayroll = activeEmployees.reduce(
      (sum, e) => sum + (e.baseSalary ?? 0),
      0,
    )
    const withSalary = activeEmployees.filter((e) => (e.baseSalary ?? 0) > 0)
    const deliveryAgents = activeEmployees.filter((e) => e.role === 'delivery')
    const deliveryWithProducts = deliveryAgents.filter(
      (e) => e.productCount > 0,
    )
    const avgSalary =
      withSalary.length > 0
        ? Math.round(monthlyPayroll / withSalary.length)
        : 0
    const periodCommissionTotal = (periodCommissions.data ?? []).reduce(
      (sum, row) => sum + row.commissionDue,
      0,
    )
    return {
      monthlyPayroll,
      avgSalary,
      withSalary: withSalary.length,
      total: activeEmployees.length,
      missingSalary: activeEmployees.length - withSalary.length,
      deliveryAgents: deliveryAgents.length,
      deliveryWithProducts: deliveryWithProducts.length,
      deliveryMissingProducts:
        deliveryAgents.length - deliveryWithProducts.length,
      periodCommissionTotal,
    }
  }, [activeEmployees, periodCommissions.data])

  const isDirty = useMemo(() => {
    return activeEmployees.some((employee) => {
      const draft = drafts[employee.id]
      if (!draft) return false
      const baseSalary = Number.parseInt(draft.baseSalary, 10) || 0
      return baseSalary !== (employee.baseSalary ?? 0)
    })
  }, [activeEmployees, drafts])

  const savePay = useMutation(
    orpc.employees.update.mutationOptions({
      onSuccess: () => employees.refetch(),
      onError: (error) => setSaveError(error.message),
    }),
  )

  function updateDraft(employeeId: string, patch: Partial<PayDraft>) {
    setDrafts((current) => ({
      ...current,
      [employeeId]: { ...current[employeeId]!, ...patch },
    }))
    setSaveError(null)
  }

  async function handleSave() {
    if (!bakeryId || !canManage) return
    setSaveError(null)

    const updates = activeEmployees.filter((employee) => {
      const draft = drafts[employee.id]
      if (!draft) return false
      const baseSalary = Number.parseInt(draft.baseSalary, 10) || 0
      return baseSalary !== (employee.baseSalary ?? 0)
    })

    try {
      for (const employee of updates) {
        const draft = drafts[employee.id]!
        await savePay.mutateAsync({
          bakeryId,
          employeeId: employee.id,
          baseSalary: Number.parseInt(draft.baseSalary, 10) || 0,
        })
      }
    } catch {
      // onError sets saveError
    }
  }

  return (
    <div className="section-stack">
      <HelpNote>
        Le salaire de base se configure dans la grille. Pour les livreurs, la
        rémunération variable vient des commissions unitaires par produit vendu
        (tournées validées) — définies dans « Commissions par produit »
        ci-dessous.
      </HelpNote>

      <section className="period-toolbar" aria-label="Période commission">
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

      <section className="stats-grid" aria-label="Synthèse rémunération">
        <dl className="stats-grid__col">
          <div className="stats-lines__row">
            <dt>Masse salariale / mois</dt>
            <dd>{formatXof(summary.monthlyPayroll)}</dd>
          </div>
        </dl>
        <dl className="stats-grid__col">
          <div className="stats-lines__row">
            <dt>Salaire moyen</dt>
            <dd>
              {summary.avgSalary > 0 ? formatXof(summary.avgSalary) : '—'}
              <span className="stats-lines__meta">
                {summary.withSalary}/{summary.total} renseignés
              </span>
            </dd>
          </div>
        </dl>
        <dl className="stats-grid__col">
          <div className="stats-lines__row">
            <dt>Commissions / période</dt>
            <dd>
              {summary.periodCommissionTotal > 0
                ? formatXof(summary.periodCommissionTotal)
                : '—'}
              <span className="stats-lines__meta">tournées validées</span>
            </dd>
          </div>
        </dl>
        {summary.missingSalary > 0 ? (
          <dl className="stats-grid__col">
            <div className="stats-lines__row stats-lines__row--warn">
              <dt>Salaire manquant</dt>
              <dd>
                {summary.missingSalary} agent
                {summary.missingSalary > 1 ? 's' : ''}
              </dd>
            </div>
          </dl>
        ) : summary.deliveryMissingProducts > 0 ? (
          <dl className="stats-grid__col">
            <div className="stats-lines__row stats-lines__row--warn">
              <dt>Livreurs sans produit</dt>
              <dd>
                {summary.deliveryMissingProducts} livreur
                {summary.deliveryMissingProducts > 1 ? 's' : ''}
              </dd>
            </div>
          </dl>
        ) : (
          <dl className="stats-grid__col">
            <div className="stats-lines__row">
              <dt>Agents actifs</dt>
              <dd>{summary.total}</dd>
            </div>
          </dl>
        )}
      </section>

      <Card
        title="Grille salariale"
        actions={
          canManage ? (
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={!isDirty || savePay.isPending}
              onClick={() => void handleSave()}
            >
              {savePay.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          ) : undefined
        }
      >
        {employees.isLoading ? (
          <p className="settings-form__hint">Chargement…</p>
        ) : activeEmployees.length === 0 ? (
          <p className="settings-form__hint">
            Aucun agent actif.{' '}
            <Link to="/equipe/annuaire" className="text-link">
              Ajoutez un membre
            </Link>
            .
          </p>
        ) : (
          <>
            {!canManage ? (
              <p className="settings-form__hint">
                Consultation seule. Seuls les responsables peuvent modifier la
                rémunération.
              </p>
            ) : null}
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Rôle</th>
                    <th className="num">Salaire / mois</th>
                    <th className="num">Produits</th>
                    <th className="num">Commission période</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {activeEmployees.map((employee) => {
                    const draft = drafts[employee.id] ?? { baseSalary: '0' }
                    return (
                      <tr key={employee.id}>
                        <td>
                          <div className="agent-lockup">
                            <div className="avatar--sm">
                              {employeeInitials(
                                employee.firstName,
                                employee.lastName,
                              )}
                            </div>
                            <Link
                              to="/equipe/agents/$employeeId"
                              params={{ employeeId: employee.id }}
                              className="agent-name text-link"
                            >
                              {employee.fullName}
                            </Link>
                          </div>
                        </td>
                        <td>
                          <Badge variant="neutral">
                            {employeeRoleLabel(employee.role)}
                          </Badge>
                        </td>
                        <td className="num">
                          {canManage ? (
                            <input
                              type="number"
                              min={0}
                              className="pay-grid-input"
                              value={draft.baseSalary}
                              onChange={(e) =>
                                updateDraft(employee.id, {
                                  baseSalary: e.target.value,
                                })
                              }
                              aria-label={`Salaire ${employee.fullName}`}
                            />
                          ) : (
                            formatXof(employee.baseSalary ?? 0)
                          )}
                        </td>
                        <td className="num">
                          {employee.role === 'delivery'
                            ? employee.productCount
                            : '—'}
                        </td>
                        <td className="num">
                          {employee.role === 'delivery'
                            ? formatXof(commissionByEmployee.get(employee.id) ?? 0)
                            : '—'}
                        </td>
                        <td>
                          {employee.role === 'delivery' ? (
                            <Link
                              to="/equipe/remuneration"
                              search={{
                                employee: employee.id,
                                period: preset,
                                start:
                                  preset === 'custom' ? customStart : undefined,
                                end:
                                  preset === 'custom' ? customEnd : undefined,
                              }}
                              className="table-action"
                            >
                              Commissions / u
                            </Link>
                          ) : (
                            <span className="settings-form__hint">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {saveError ? (
              <p className="settings-form__error">{saveError}</p>
            ) : null}
          </>
        )}
      </Card>

      <section
        className="section-stack__subsection"
        aria-label="Commissions par produit"
      >
        <h2 className="section-subhead">Commissions par produit</h2>
        <p className="settings-form__hint">
          Sélectionnez un livreur pour définir les produits qu&apos;il peut
          vendre et la commission unitaire (XOF / unité vendue).
        </p>
        <AffectationsView employeeId={employeeId} embedded />
      </section>
    </div>
  )
}
