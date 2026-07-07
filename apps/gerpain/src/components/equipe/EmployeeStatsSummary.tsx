import type { ReactNode } from 'react'

import { formatXof } from '#/lib/format-money'

export type EmployeeStats = {
  total: number
  active: number
  inactive: number
  delivery: number
  cashier: number
  baker: number
  manager: number
  monthlyPayroll: number
  avgSalary: number
  salaryCoveragePct: number
  assignedProducts: number
  avgProductsPerDelivery: number
  deliveryReady: number
  deliveryReadyPct: number
  withLocation: number
  withPhone: number
  missingSalary: number
  missingProducts: number
  missingLocation: number
  missingPhone: number
}

type StatLineProps = {
  label: string
  value: ReactNode
  meta?: ReactNode
  warn?: boolean
}

function StatLine({ label, value, meta, warn }: StatLineProps) {
  return (
    <div className={`stats-lines__row${warn ? ' stats-lines__row--warn' : ''}`}>
      <dt>{label}</dt>
      <dd>
        {value}
        {meta ? <span className="stats-lines__meta">{meta}</span> : null}
      </dd>
    </div>
  )
}

type StatColumnProps = {
  children: ReactNode
}

function StatColumn({ children }: StatColumnProps) {
  return <dl className="stats-grid__col">{children}</dl>
}

type EmployeeStatsSummaryProps = {
  stats: EmployeeStats
}

export function EmployeeStatsSummary({ stats }: EmployeeStatsSummaryProps) {
  const roleParts = [
    stats.delivery > 0 ? `${stats.delivery} livr.` : null,
    stats.cashier > 0 ? `${stats.cashier} caiss.` : null,
    stats.baker > 0 ? `${stats.baker} boul.` : null,
    stats.manager > 0 ? `${stats.manager} resp.` : null,
  ].filter(Boolean)

  return (
    <section className="stats-grid" aria-label="Indicateurs équipe">
      <StatColumn>
        <StatLine
          label="Effectif actif"
          value={stats.active}
          meta={`sur ${stats.total}`}
        />
        <StatLine
          label="Archivés"
          value={stats.inactive}
          warn={stats.inactive > 0}
        />
        {roleParts.length > 0 ? (
          <StatLine label="Répartition" value={roleParts.join(' · ')} />
        ) : null}
      </StatColumn>

      <StatColumn>
        <StatLine
          label="Masse salariale / mois"
          value={formatXof(stats.monthlyPayroll)}
        />
        <StatLine
          label="Salaire moyen"
          value={stats.avgSalary > 0 ? formatXof(stats.avgSalary) : '—'}
          meta={
            stats.salaryCoveragePct > 0
              ? `${stats.salaryCoveragePct} % renseignés`
              : undefined
          }
        />
        {stats.missingSalary > 0 ? (
          <StatLine
            label="Salaire manquant"
            value={stats.missingSalary}
            meta="agent(s)"
            warn
          />
        ) : null}
      </StatColumn>

      <StatColumn>
        <StatLine
          label="Produits assignés"
          value={stats.assignedProducts}
          meta="total actifs"
        />
        <StatLine
          label="Moy. / livreur"
          value={
            stats.delivery > 0
              ? stats.avgProductsPerDelivery.toFixed(1)
              : '—'
          }
        />
        <StatLine
          label="Livreurs prêts"
          value={stats.deliveryReady}
          meta={
            stats.delivery > 0
              ? `${stats.deliveryReadyPct} % des livreurs`
              : undefined
          }
        />
        {stats.missingProducts > 0 ? (
          <StatLine
            label="Sans produit"
            value={stats.missingProducts}
            meta="livreur(s)"
            warn
          />
        ) : null}
      </StatColumn>

      <StatColumn>
        <StatLine
          label="Lieux assignés"
          value={stats.withLocation}
          meta={`sur ${stats.active} actifs`}
        />
        <StatLine
          label="Contacts renseignés"
          value={stats.withPhone}
          meta={`sur ${stats.active} actifs`}
        />
        {stats.missingLocation > 0 ? (
          <StatLine
            label="Sans lieu"
            value={stats.missingLocation}
            meta="agent(s)"
            warn
          />
        ) : null}
        {stats.missingPhone > 0 ? (
          <StatLine
            label="Sans téléphone"
            value={stats.missingPhone}
            meta="agent(s)"
            warn
          />
        ) : null}
      </StatColumn>
    </section>
  )
}
