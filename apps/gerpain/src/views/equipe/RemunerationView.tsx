import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
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
import { mutationError, mutationSuccess } from '#/lib/mutation-feedback'
import { orpc } from '#/lib/orpc-client'
import { useToast } from '#/lib/toast'
import { usePermissions } from '#/lib/use-permissions'
import { AffectationsView } from '#/views/equipe/AffectationsView'

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
  const toast = useToast()
  const [drafts, setDrafts] = useState<Record<string, PayDraft>>({})
  const [saveError, setSaveError] = useState<string | null>(null)

  const employees = useQuery({
    ...orpc.employees.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

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
    }
  }, [activeEmployees])

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
      onError: (error) => {
        setSaveError(error.message)
        mutationError(toast, 'Impossible d\'enregistrer la rémunération')(error)
      },
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
      if (updates.length > 0) {
        mutationSuccess(
          toast,
          updates.length === 1
            ? 'Rémunération enregistrée'
            : `${updates.length} rémunérations enregistrées`,
        )()
      }
    } catch {
      // onError sets saveError + toast
    }
  }

  return (
    <div className="section-stack">
      <HelpNote>
        Règles de paie durables : salaire de base et commissions unitaires par
        produit. L&apos;aperçu et la clôture de période se font dans{' '}
        <Link to="/equipe/paie" className="text-link">
          Paie
        </Link>
        .
      </HelpNote>

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
            <dt>Livreurs avec produits</dt>
            <dd>
              {summary.deliveryWithProducts}
              <span className="stats-lines__meta">
                sur {summary.deliveryAgents} livreur
                {summary.deliveryAgents > 1 ? 's' : ''}
              </span>
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
                        <td>
                          {employee.role === 'delivery' ? (
                            <Link
                              to="/equipe/remuneration"
                              search={{ employee: employee.id }}
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
