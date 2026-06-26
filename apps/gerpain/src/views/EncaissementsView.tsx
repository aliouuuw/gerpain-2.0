import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { useBakery } from '#/lib/bakery-context'
import { collectedAmount } from '#/lib/day-operations'
import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import { usePermissions } from '#/lib/use-permissions'
import { useShellDate } from '#/lib/use-shell-date'

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

export function EncaissementsView() {
  const { bakeryId, isLoading: bakeryLoading } = useBakery()
  const { operationalDate } = useShellDate()
  const { canManageCollections } = usePermissions()

  const collections = useQuery({
    ...orpc.collections.list.queryOptions({
      input: { bakeryId, date: operationalDate },
    }),
    enabled: Boolean(bakeryId),
  })

  const stats = useMemo(() => {
    const rows = collections.data ?? []
    const expected = rows.reduce((sum, col) => sum + col.expectedAmount, 0)
    const collected = rows.reduce(
      (sum, col) => sum + collectedAmount(col),
      0,
    )
    return {
      expected,
      collected,
      balance: collected - expected,
    }
  }, [collections.data])

  return (
    <main className="page-content">
      <section className="money-strip money-strip--compact" aria-label="Totaux encaissements">
        <div className="money-strip__item">
          <span className="money-strip__label">Attendu</span>
          <span className="money-strip__value">{formatXof(stats.expected)}</span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Reçu</span>
          <span className="money-strip__value money-strip__value--ok">
            {formatXof(stats.collected)}
          </span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Écart total</span>
          <span className={`money-strip__value ${varianceClass(stats.balance)}`}>
            {stats.balance === 0
              ? '0 F'
              : formatXof(Math.abs(stats.balance))}
            {stats.balance < 0
              ? ' (manque)'
              : stats.balance > 0
                ? ' (excédent)'
                : ''}
          </span>
        </div>
      </section>

      <HelpNote>
        L’argent attendu vient de la livraison validée. Saisissez ce que l’agent a
        réellement remis, puis validez. Un écart négatif signifie qu’il manque de
        l’argent.
      </HelpNote>

      <Card>
        {bakeryLoading || collections.isLoading ? (
          <p className="empty-state">Chargement des encaissements…</p>
        ) : collections.isError ? (
          <p className="empty-state">Impossible de charger les encaissements.</p>
        ) : !collections.data || collections.data.length === 0 ? (
          <p className="empty-state">Aucun encaissement pour cette journée.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Attendu</th>
                <th>Reçu</th>
                <th>Écart</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {collections.data.map((row) => {
                const collected = collectedAmount(row)
                const variance =
                  row.variance ?? collected - row.expectedAmount
                const canRecord =
                  row.status === 'pending' || row.status === 'rejected'
                const canValidate = row.status === 'submitted'

                return (
                  <tr key={row.id}>
                    <td>
                      <span className="cell-agent">{row.employeeName}</span>
                      <span className="cell-sub">{row.employeeRole}</span>
                    </td>
                    <td className="cell-money">
                      {formatXof(row.expectedAmount)}
                    </td>
                    <td className="cell-money">
                      {collected > 0 ? formatXof(collected) : '—'}
                    </td>
                    <td className={`cell-money ${varianceClass(variance)}`}>
                      {collected === 0
                        ? '—'
                        : variance === 0
                          ? '0 F'
                          : `${variance > 0 ? '+' : '−'}${formatXof(Math.abs(variance))}`}
                    </td>
                    <td>{collectionBadge(row.status)}</td>
                    <td>
                      <Link
                        to="/collections/$collectionId"
                        params={{ collectionId: row.id }}
                        className={`table-action${canValidate && canManageCollections ? ' table-action--primary' : ''}`}
                      >
                        {canValidate && canManageCollections
                          ? 'Valider'
                          : canRecord
                            ? 'Saisir l’argent'
                            : 'Voir'}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  )
}
