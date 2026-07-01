import { useQuery } from '@tanstack/react-query'
import { getRouteApi, Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { useBakery } from '#/lib/bakery-context'
import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import {
  formatPeriodLabel,
  periodBounds,
  presetLabel,
  type PeriodPreset,
} from '#/lib/period'
import { todayIso } from '#/lib/today'

const routeApi = getRouteApi('/_shell/reconciliations')

function soldeClass(solde: number): string {
  if (solde < 0) return 'money-strip__value--warn'
  if (solde > 0) return 'money-strip__value--info'
  return 'money-strip__value--ok'
}

function roleBadgeVariant(role: string) {
  return role === 'delivery' ? 'info' : 'neutral'
}

export function ReconciliationsView() {
  const { bakeryId, isLoading: bakeryLoading } = useBakery()
  const search = routeApi.useSearch()
  const patchNavigate = routeApi.useNavigate()
  const navigate = useNavigate()

  const bakeryDetail = useQuery({
    ...orpc.bakeries.get.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const preset: PeriodPreset =
    search.period ??
    bakeryDetail.data?.settings.defaultPayrollPreset ??
    'month'
  const customStart = search.start ?? todayIso()
  const customEnd = search.end ?? todayIso()
  const roleFilter = search.role ?? 'all'
  const settledFilter = search.settled ?? 'all'

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

  const overview = useQuery({
    ...orpc.collections.overview.queryOptions({
      input: {
        bakeryId,
        startDate,
        endDate,
        role:
          roleFilter === 'all'
            ? undefined
            : (roleFilter as 'delivery' | 'cashier'),
        isSettled:
          settledFilter === 'all'
            ? undefined
            : settledFilter === 'settled',
      },
    }),
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

  const totals = useMemo(() => {
    const rows = overview.data ?? []
    return {
      tournees: rows.reduce((sum, row) => sum + row.tournees, 0),
      totalExpected: rows.reduce((sum, row) => sum + row.totalExpected, 0),
      totalCollected: rows.reduce((sum, row) => sum + row.totalCollected, 0),
      solde: rows.reduce((sum, row) => sum + row.solde, 0),
      commissionDue: (periodCommissions.data ?? []).reduce(
        (sum, row) => sum + row.commissionDue,
        0,
      ),
    }
  }, [overview.data, periodCommissions.data])

  function handleRowClick(employeeId: string) {
    void navigate({
      to: '/encaissements',
      search: {
        employee: employeeId,
        period: preset === 'week' ? undefined : preset,
        start: preset === 'custom' ? startDate : undefined,
        end: preset === 'custom' ? endDate : undefined,
      },
    })
  }

  return (
    <main className="page-content">
      <div className="period-toolbar__group" style={{ marginBottom: '1rem' }}>
        <Link to="/encaissements" className="text-link">
          ← Retour aux encaissements
        </Link>
      </div>

      <section className="period-toolbar" aria-label="Filtres réconciliations">
        <div className="period-toolbar__group">
          <span className="period-toolbar__label">Période</span>
          <div className="period-toolbar__presets">
            {(['week', 'month', 'last15', 'custom'] as PeriodPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`preset-btn ${preset === p ? 'preset-btn--active' : ''}`}
                onClick={() =>
                  patchSearch({ period: p === 'month' ? undefined : p })
                }
              >
                {presetLabel(p)}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="period-toolbar__custom">
              <input
                type="date"
                value={customStart}
                onChange={(e) =>
                  patchSearch({ start: e.target.value, period: 'custom' })
                }
              />
              <span>à</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) =>
                  patchSearch({ end: e.target.value, period: 'custom' })
                }
              />
            </div>
          )}
        </div>

        <div className="period-toolbar__group">
          <span className="period-toolbar__label">Rôle</span>
          <select
            className="employee-select"
            value={roleFilter}
            onChange={(e) =>
              patchSearch({
                role: e.target.value as 'all' | 'delivery' | 'cashier',
              })
            }
          >
            <option value="all">Tous</option>
            <option value="delivery">Livreurs</option>
            <option value="cashier">Caissiers</option>
          </select>
        </div>

        <div className="period-toolbar__group">
          <span className="period-toolbar__label">Paie</span>
          <select
            className="employee-select"
            value={settledFilter}
            onChange={(e) =>
              patchSearch({
                settled: e.target.value as 'all' | 'unsettled' | 'settled',
              })
            }
          >
            <option value="all">Tous</option>
            <option value="unsettled">Non réglés</option>
            <option value="settled">Réglés</option>
          </select>
        </div>
      </section>

      <HelpNote>
        Vue d&apos;ensemble : {formatPeriodLabel(startDate, endDate)}. Caisse
        (attendu / collecté / solde) et commission due (tournées validées).
        Cliquez sur un agent pour le détail des encaissements.
      </HelpNote>

      <Card title="Récapitulatif par agent">
        {!bakeryId || bakeryLoading || overview.isLoading ? (
          <p className="empty-state">Chargement…</p>
        ) : overview.isError ? (
          <p className="empty-state">Impossible de charger les réconciliations.</p>
        ) : !overview.data || overview.data.length === 0 ? (
          <p className="empty-state">
            Aucune donnée pour cette période et ces filtres.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Rôle</th>
                <th className="num">Tournées</th>
                <th className="num">Attendu</th>
                <th className="num">Collecté</th>
                <th className="num">Solde</th>
                <th className="num">Commission</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {overview.data.map((row) => (
                <tr
                  key={row.employeeId}
                  className="data-table__row--clickable"
                  onClick={() => handleRowClick(row.employeeId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleRowClick(row.employeeId)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <td>{row.employeeName}</td>
                  <td>
                    <Badge variant={roleBadgeVariant(row.role)}>
                      {row.roleLabel}
                    </Badge>
                  </td>
                  <td className="num">{row.tournees}</td>
                  <td className="num">{formatXof(row.totalExpected)}</td>
                  <td className="num">{formatXof(row.totalCollected)}</td>
                  <td className={`num ${soldeClass(row.solde)}`}>
                    <span className="solde-cell">
                      {row.solde < 0 && (
                        <AlertTriangle size={14} aria-hidden="true" />
                      )}
                      {row.solde === 0 && (
                        <CheckCircle2 size={14} aria-hidden="true" />
                      )}
                      {formatXof(Math.abs(row.solde))}
                      {row.solde < 0 ? ' (doit)' : row.solde > 0 ? ' (excès)' : ''}
                    </span>
                  </td>
                  <td className="num">
                    {row.role === 'delivery'
                      ? formatXof(commissionByEmployee.get(row.employeeId) ?? 0)
                      : '—'}
                  </td>
                  <td>
                    <ArrowRight size={16} aria-hidden="true" />
                  </td>
                </tr>
              ))}
              <tr className="data-table__row--total">
                <td colSpan={2}>Total</td>
                <td className="num">{totals.tournees}</td>
                <td className="num">{formatXof(totals.totalExpected)}</td>
                <td className="num">{formatXof(totals.totalCollected)}</td>
                <td className={`num ${soldeClass(totals.solde)}`}>
                  {formatXof(Math.abs(totals.solde))}
                </td>
                <td className="num">{formatXof(totals.commissionDue)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
      </Card>
    </main>
  )
}
