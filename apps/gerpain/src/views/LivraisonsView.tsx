import { useNavigate } from '@tanstack/react-router'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { agentDays, formatCurrency } from '#/mock/operational'

function deliveryBadge(status: string) {
  switch (status) {
    case 'Validé':
      return <Badge variant="success">Validé</Badge>
    case 'À valider':
      return <Badge variant="warning">À valider</Badge>
    case 'Brouillon':
      return <Badge variant="neutral">Brouillon</Badge>
    default:
      return <Badge variant="neutral">{status}</Badge>
  }
}

export function LivraisonsView() {
  const navigate = useNavigate()

  return (
    <main className="page-content">
      <HelpNote>
        Une ligne par agent. Quand vous validez, l’encaissement correspondant est créé
        automatiquement — vous pourrez saisir l’argent dans l’onglet Encaissements.
      </HelpNote>

      <Card>
        <table className="data-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Vendu (unités)</th>
              <th>CA attendu</th>
              <th>Encaissement</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {agentDays.map((row) => (
              <tr key={row.agentId}>
                <td>
                  <span className="cell-agent">{row.agent}</span>
                  <span className="cell-sub">{row.role}</span>
                </td>
                <td>
                  {row.matinQty > 0 && <span>Matin {row.matinQty}</span>}
                  {row.matinQty > 0 && row.soirQty > 0 && ' · '}
                  {row.soirQty > 0 && <span>Soir {row.soirQty}</span>}
                  {row.matinQty === 0 && row.soirQty === 0 && '—'}
                </td>
                <td className="cell-money">{formatCurrency(row.expected)}</td>
                <td>
                  {row.hasCollection ? (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => void navigate({ to: '/encaissements' })}
                    >
                      Voir l’encaissement →
                    </button>
                  ) : (
                    <span className="cell-muted">Après validation</span>
                  )}
                </td>
                <td>{deliveryBadge(row.deliveryStatus)}</td>
                <td>
                  <button type="button" className="table-action table-action--primary">
                    {row.deliveryStatus === 'Validé' ? 'Voir' : 'Valider'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  )
}
