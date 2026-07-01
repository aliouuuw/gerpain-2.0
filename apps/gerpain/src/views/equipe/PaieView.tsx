import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi, Link } from '@tanstack/react-router'
import { CheckCircle2, Lock } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { useBakery } from '#/lib/bakery-context'
import { employeeRoleLabel } from '#/lib/employee-labels'
import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import {
  formatPeriodLabel,
  periodBounds,
  periodLabelFromEndDate,
  presetLabel,
  type PeriodPreset,
} from '#/lib/period'
import { downloadPayrollCsv } from '#/lib/payroll-csv'
import { todayIso } from '#/lib/today'
import { usePermissions } from '#/lib/use-permissions'

const routeApi = getRouteApi('/_shell/equipe/paie')

type PayrollLine = {
  employeeId: string
  employeeName: string
  role: string
  baseSalary: number
  commissionAmount: number
  commissionUnitsSold: number
  commissionUnitsCommissioned: number
  commissionValidatedRuns: number
  commissionProducts: Array<{
    productId: string
    productName: string
    unitsSold: number
    commissionPerUnit: number
    commissionAmount: number
  }>
  advanceDeduction: number
  advanceInstallments: Array<{
    id: string
    amount: number
    installmentNumber: number
    duePeriod: string | null
  }>
  bonusAmount: number
  bonuses: Array<{
    id: string
    amount: number
    reason: string | null
    duePeriod: string
  }>
  collectionBalance: {
    totalExpected: number
    totalCollected: number
    solde: number
    collectionCount: number
  } | null
  collectionDeduction: number
  grossAmount: number
  netAmount: number
}

function soldeLabel(solde: number): string {
  if (solde === 0) return 'équilibré'
  if (solde < 0) return 'manque'
  return 'excédent'
}

function soldeClass(solde: number): string {
  if (solde < 0) return 'money-strip__value--warn'
  if (solde > 0) return 'money-strip__value--info'
  return 'money-strip__value--ok'
}

function formulaSummary(line: PayrollLine): string {
  const parts = [formatXof(line.baseSalary)]
  if (line.bonusAmount > 0) {
    parts.push(`+ ${formatXof(line.bonusAmount)}`)
  }
  if (line.role === 'delivery' && line.commissionAmount > 0) {
    parts.push(`+ ${formatXof(line.commissionAmount)}`)
  }
  if (line.advanceDeduction > 0) {
    parts.push(`− ${formatXof(line.advanceDeduction)}`)
  }
  if (line.collectionDeduction > 0) {
    parts.push(`− ${formatXof(line.collectionDeduction)}`)
  }
  return parts.join(' ')
}

function PayrollLineBreakdown({
  line,
  periodPreset,
  startDate,
  endDate,
}: {
  line: PayrollLine
  periodPreset: PeriodPreset
  startDate: string
  endDate: string
}) {
  return (
    <dl className="fiche-details pay-breakdown">
      <div className="fiche-details__row">
        <dt>Salaire de base</dt>
        <dd className="num">{formatXof(line.baseSalary)}</dd>
      </div>
      {line.role === 'delivery' ? (
        <div className="fiche-details__row">
          <dt>Commission produits</dt>
          <dd className="num">
            {formatXof(line.commissionAmount)}
            <span className="stats-lines__meta">
              {line.commissionUnitsCommissioned} u. commissionnée
              {line.commissionUnitsCommissioned > 1 ? 's' : ''}
              {line.commissionUnitsSold > line.commissionUnitsCommissioned
                ? ` · ${line.commissionUnitsSold - line.commissionUnitsCommissioned} u. à 0`
                : ''}{' '}
              · {line.commissionValidatedRuns} tournée
              {line.commissionValidatedRuns > 1 ? 's' : ''} validée
              {line.commissionValidatedRuns > 1 ? 's' : ''}
            </span>
          </dd>
        </div>
      ) : null}
      {line.role === 'delivery' && line.commissionProducts.length > 0 ? (
        <div className="pay-breakdown__installments">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Produit</th>
                <th className="num">Vendu</th>
                <th className="num">Commission / u</th>
                <th className="num">Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {line.commissionProducts.map((product) => (
                <tr key={product.productId}>
                  <td>{product.productName}</td>
                  <td className="num">{product.unitsSold}</td>
                  <td className="num">
                    {formatXof(product.commissionPerUnit)}
                  </td>
                  <td className="num">
                    {formatXof(product.commissionAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {line.bonusAmount > 0 ? (
        <div className="fiche-details__row">
          <dt>Primes</dt>
          <dd className="num">
            + {formatXof(line.bonusAmount)}
            <span className="stats-lines__meta">
              {line.bonuses.length} prime{line.bonuses.length > 1 ? 's' : ''}
            </span>
          </dd>
        </div>
      ) : null}
      {line.bonuses.length > 0 ? (
        <div className="pay-breakdown__installments">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Période due</th>
                <th>Motif</th>
                <th className="num">Montant</th>
              </tr>
            </thead>
            <tbody>
              {line.bonuses.map((bonus) => (
                <tr key={bonus.id}>
                  <td>{bonus.duePeriod}</td>
                  <td>{bonus.reason ?? '—'}</td>
                  <td className="num">{formatXof(bonus.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {line.advanceDeduction > 0 ? (
        <div className="fiche-details__row">
          <dt>Retenues avances</dt>
          <dd className="num">
            − {formatXof(line.advanceDeduction)}
            <span className="stats-lines__meta">
              {line.advanceInstallments.length} échéance
              {line.advanceInstallments.length > 1 ? 's' : ''} · déduit du net
            </span>
          </dd>
        </div>
      ) : (
        <div className="fiche-details__row pay-breakdown__info-row">
          <dt>Retenues avances</dt>
          <dd className="num pay-breakdown__muted">Aucune échéance due</dd>
        </div>
      )}
      {line.advanceInstallments.length > 0 ? (
        <div className="pay-breakdown__installments">
          <table className="data-table data-table--compact">
            <thead>
              <tr>
                <th>Échéance</th>
                <th>Période due</th>
                <th className="num">Montant</th>
              </tr>
            </thead>
            <tbody>
              {line.advanceInstallments.map((inst) => (
                <tr key={inst.id}>
                  <td>n° {inst.installmentNumber}</td>
                  <td>{inst.duePeriod ?? '—'}</td>
                  <td className="num">{formatXof(inst.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {line.role === 'delivery' && line.collectionBalance ? (
        <div className="fiche-details__row">
          <dt>
            {line.collectionDeduction > 0
              ? 'Retenue caisse (manque)'
              : 'Solde encaissements'}
          </dt>
          <dd className="num">
            {line.collectionDeduction > 0 ? (
              <>− {formatXof(line.collectionDeduction)}</>
            ) : (
              <span className={soldeClass(line.collectionBalance.solde)}>
                {formatXof(Math.abs(line.collectionBalance.solde))}
                {line.collectionBalance.solde !== 0
                  ? ` (${soldeLabel(line.collectionBalance.solde)})`
                  : ''}
              </span>
            )}
            <span className="stats-lines__meta">
              {formatXof(line.collectionBalance.totalCollected)} collecté sur{' '}
              {formatXof(line.collectionBalance.totalExpected)}
              {line.collectionDeduction > 0 ? ' · déduit du net' : ''}
            </span>
          </dd>
        </div>
      ) : null}
      <div className="fiche-details__row fiche-details__row--emphasis">
        <dt>Net à payer</dt>
        <dd className="num">{formatXof(line.netAmount)}</dd>
      </div>
      <div className="pay-breakdown__links">
        <Link
          to="/equipe/agents/$employeeId"
          params={{ employeeId: line.employeeId }}
          search={{
            tab: 'remuneration',
            period: periodPreset,
            start: periodPreset === 'custom' ? startDate : undefined,
            end: periodPreset === 'custom' ? endDate : undefined,
          }}
          className="text-link"
        >
          Règles de rémunération
        </Link>
        {line.role === 'delivery' ? (
          <>
            <span aria-hidden="true"> · </span>
            <Link
              to="/equipe/agents/$employeeId"
              params={{ employeeId: line.employeeId }}
              search={{
                tab: 'activite',
                period: periodPreset,
                start: periodPreset === 'custom' ? startDate : undefined,
                end: periodPreset === 'custom' ? endDate : undefined,
              }}
              className="text-link"
            >
              Tournées & activité
            </Link>
          </>
        ) : null}
        {line.advanceDeduction > 0 ? (
          <>
            <span aria-hidden="true"> · </span>
            <Link
              to="/equipe/agents/$employeeId"
              params={{ employeeId: line.employeeId }}
              search={{ tab: 'avances' }}
              className="text-link"
            >
              Avances
            </Link>
          </>
        ) : null}
      </div>
    </dl>
  )
}

export function PaieView() {
  const { bakeryId, isLoading: bakeryLoading } = useBakery()
  const { canManageCollections: canManage } = usePermissions()
  const search = routeApi.useSearch()
  const patchNavigate = routeApi.useNavigate()
  const queryClient = useQueryClient()
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(
    null,
  )

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

  const preview = useQuery({
    ...orpc.payroll.preview.queryOptions({
      input: { bakeryId, startDate, endDate },
    }),
    enabled: Boolean(bakeryId),
  })

  const history = useQuery({
    ...orpc.payroll.list.queryOptions({ input: { bakeryId } }),
    enabled: Boolean(bakeryId),
  })

  const closePayroll = useMutation(
    orpc.payroll.close.mutationOptions({
      onSuccess: () => {
        void preview.refetch()
        void history.refetch()
        void queryClient.invalidateQueries({
          queryKey: orpc.salaryAdvances.list.key(),
        })
      },
    }),
  )

  const lines = (preview.data?.lines ?? []) as PayrollLine[]
  const totals = preview.data?.totals
  const isClosed = preview.data?.isClosed ?? false

  function toggleEmployee(employeeId: string) {
    setExpandedEmployeeId((current) =>
      current === employeeId ? null : employeeId,
    )
  }

  return (
    <div className="section-stack">
      <section className="period-toolbar" aria-label="Filtres paie">
        <div className="period-toolbar__group">
          <span className="period-toolbar__label">Période</span>
          <div className="period-toolbar__presets">
            {(['week', 'month', 'last15', 'custom'] as PeriodPreset[]).map(
              (p) => (
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
              ),
            )}
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
      </section>

      <HelpNote>
        Aperçu paie : {formatPeriodLabel(startDate, endDate)}. Net = salaire de
        base + commissions + primes − retenues avances − manque caisse (si
        applicable). À la clôture, les encaissements validés sont marqués réglés.
        Cliquez sur un agent pour le détail.
      </HelpNote>

      {isClosed ? (
        <p className="settings-form__hint settings-coming-soon">
          <CheckCircle2
            size={16}
            aria-hidden="true"
            style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }}
          />
          Période clôturée — bulletin figé au moment de la clôture. Consultez
          l&apos;historique pour rouvrir une période passée.
        </p>
      ) : null}

      {totals ? (
        <section className="stats-grid" aria-label="Synthèse paie">
          <dl className="stats-grid__col">
            <div className="stats-lines__row">
              <dt>Net à payer</dt>
              <dd>{formatXof(totals.net)}</dd>
            </div>
          </dl>
          <dl className="stats-grid__col">
            <div className="stats-lines__row">
              <dt>Brut total</dt>
              <dd>{formatXof(totals.gross)}</dd>
            </div>
          </dl>
          <dl className="stats-grid__col">
            <div className="stats-lines__row">
              <dt>Commissions</dt>
              <dd>{formatXof(totals.commission)}</dd>
            </div>
          </dl>
          <dl className="stats-grid__col">
            <div className="stats-lines__row">
              <dt>Retenues avances</dt>
              <dd>{formatXof(totals.advanceDeduction)}</dd>
            </div>
          </dl>
          <dl className="stats-grid__col">
            <div className="stats-lines__row">
              <dt>Retenues caisse</dt>
              <dd>{formatXof(totals.collectionDeduction)}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <Card
        title="Bulletin par agent"
        actions={
          <div className="card-actions-row">
            {preview.data && lines.length > 0 ? (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => {
                  if (!preview.data) return
                  downloadPayrollCsv(
                    preview.data,
                    `paie-${periodLabelFromEndDate(endDate)}.csv`,
                  )
                }}
              >
                Exporter CSV
              </button>
            ) : null}
            {canManage && !isClosed ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={
                  !bakeryId ||
                  preview.isLoading ||
                  closePayroll.isPending ||
                  lines.length === 0
                }
                onClick={() => {
                  if (!bakeryId) return
                  closePayroll.mutate({ bakeryId, startDate, endDate })
                }}
              >
                {closePayroll.isPending ? 'Clôture…' : 'Clôturer la période'}
              </button>
            ) : isClosed ? (
              <span className="settings-form__hint">
                <Lock size={14} aria-hidden="true" /> Clôturée
              </span>
            ) : null}
          </div>
        }
      >
        {!bakeryId || bakeryLoading || preview.isLoading ? (
          <p className="empty-state">Chargement…</p>
        ) : preview.isError ? (
          <p className="empty-state">Impossible de charger l&apos;aperçu paie.</p>
        ) : lines.length === 0 ? (
          <p className="empty-state">Aucun agent actif pour cette période.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table data-table--expandable">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Rôle</th>
                  <th>Calcul</th>
                  <th className="num">Net à payer</th>
                  <th aria-hidden="true" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const isExpanded = expandedEmployeeId === line.employeeId
                  return (
                    <Fragment key={line.employeeId}>
                      <tr
                        className={`data-table__row--clickable${isExpanded ? ' data-table__row--selected' : ''}`}
                        onClick={() => toggleEmployee(line.employeeId)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            toggleEmployee(line.employeeId)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-expanded={isExpanded}
                      >
                        <td>{line.employeeName}</td>
                        <td>
                          <Badge variant="neutral">
                            {employeeRoleLabel(line.role)}
                          </Badge>
                        </td>
                        <td className="pay-formula-cell">
                          {formulaSummary(line)}
                        </td>
                        <td className="num">{formatXof(line.netAmount)}</td>
                        <td className="status-cell__chevron">
                          {isExpanded ? '▲' : '▼'}
                        </td>
                      </tr>
                      {isExpanded ? (
                        <tr className="data-table__expand-row">
                          <td colSpan={5}>
                            <PayrollLineBreakdown
                              line={line}
                              periodPreset={preset}
                              startDate={startDate}
                              endDate={endDate}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {closePayroll.isError ? (
          <p className="settings-form__error">{closePayroll.error.message}</p>
        ) : null}
      </Card>

      <Card title="Historique des clôtures">
        {history.isLoading ? (
          <p className="empty-state">Chargement…</p>
        ) : !history.data || history.data.length === 0 ? (
          <p className="empty-state">Aucune clôture enregistrée.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table data-table--expandable">
              <thead>
                <tr>
                  <th>Période</th>
                  <th>Libellé</th>
                  <th className="num">Agents</th>
                  <th className="num">Brut</th>
                  <th className="num">Net</th>
                  <th>Clôturée le</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((run) => {
                  const isSelected = search.runId === run.id
                  return (
                    <tr
                      key={run.id}
                      className={`data-table__row--clickable${isSelected ? ' data-table__row--selected' : ''}`}
                      onClick={() => {
                        void patchNavigate({
                          search: {
                            period: 'custom',
                            start: run.startDate,
                            end: run.endDate,
                            runId: run.id,
                          },
                          replace: true,
                        })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          void patchNavigate({
                            search: {
                              period: 'custom',
                              start: run.startDate,
                              end: run.endDate,
                              runId: run.id,
                            },
                            replace: true,
                          })
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      <td>{formatPeriodLabel(run.startDate, run.endDate)}</td>
                      <td>{run.periodLabel}</td>
                      <td className="num">{run.employeeCount}</td>
                      <td className="num">{formatXof(run.totalGross)}</td>
                      <td className="num">{formatXof(run.totalNet)}</td>
                      <td>
                        {run.closedAt
                          ? new Intl.DateTimeFormat('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            }).format(new Date(run.closedAt))
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="settings-form__hint" style={{ marginTop: '0.75rem' }}>
          Cliquez sur une ligne pour afficher le bulletin figé de la clôture.
        </p>
      </Card>
    </div>
  )
}
