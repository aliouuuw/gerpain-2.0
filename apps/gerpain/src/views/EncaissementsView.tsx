import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { agentDays, formatCurrency, getDayStats, getVariance } from '#/mock/operational'

function collectionBadge(status: string) {
  switch (status) {
    case 'Validé':
      return <Badge variant="success">Validé</Badge>
    case 'Soumis':
      return <Badge variant="warning">À valider</Badge>
    case 'En attente':
      return <Badge variant="info">En attente</Badge>
    case 'Rejeté':
      return <Badge variant="danger">Rejeté</Badge>
    default:
      return <Badge variant="neutral">{status}</Badge>
  }
}

function varianceClass(variance: number): string {
  if (variance < 0) return 'text-warning'
  if (variance > 0) return 'text-success'
  return ''
}

export function EncaissementsView() {
  const stats = getDayStats()

  return (
    <main className="page-content">
      <section className="money-strip money-strip--compact" aria-label="Totaux encaissements">
        <div className="money-strip__item">
          <span className="money-strip__label">Attendu</span>
          <span className="money-strip__value">{formatCurrency(stats.expected)}</span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Reçu</span>
          <span className="money-strip__value money-strip__value--ok">
            {formatCurrency(stats.collected)}
          </span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Écart total</span>
          <span className={`money-strip__value ${varianceClass(stats.balance)}`}>
            {stats.balance === 0 ? '0 F' : formatCurrency(Math.abs(stats.balance))}
            {stats.balance < 0 ? ' (manque)' : stats.balance > 0 ? ' (excédent)' : ''}
          </span>
        </div>
      </section>

      <HelpNote>
        L’argent attendu vient de la livraison validée. Saisissez ce que l’agent a
        réellement remis, puis validez. Un écart négatif signifie qu’il manque de
        l’argent.
      </HelpNote>

      <Card>
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
            {agentDays.map((row) => {
              const variance = getVariance(row)
              const canRecord =
                row.deliveryStatus === 'Validé' &&
                (row.collectionStatus === 'En attente' || row.collectionStatus === 'Rejeté')
              const canValidate = row.collectionStatus === 'Soumis'

              return (
                <tr key={row.agentId}>
                  <td>
                    <span className="cell-agent">{row.agent}</span>
                    <span className="cell-sub">{row.role}</span>
                  </td>
                  <td className="cell-money">{formatCurrency(row.expected)}</td>
                  <td className="cell-money">
                    {row.collected > 0 ? formatCurrency(row.collected) : '—'}
                  </td>
                  <td className={`cell-money ${varianceClass(variance)}`}>
                    {row.collected === 0
                      ? '—'
                      : variance === 0
                        ? '0 F'
                        : `${variance > 0 ? '+' : '−'}${formatCurrency(Math.abs(variance))}`}
                  </td>
                  <td>{collectionBadge(row.collectionStatus)}</td>
                  <td>
                    <button
                      type="button"
                      className={`table-action ${canValidate ? 'table-action--primary' : ''}`}
                    >
                      {canValidate ? 'Valider' : canRecord ? 'Saisir l’argent' : 'Voir'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </main>
  )
}
