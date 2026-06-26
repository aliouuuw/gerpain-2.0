import { useNavigate } from '@tanstack/react-router'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { agentDays, formatCurrency, getDayStats } from '#/mock/operational'

export function HomeView() {
  const navigate = useNavigate()
  const stats = getDayStats()

  const tasks: {
    id: string
    label: string
    detail: string
    to: '/livraisons' | '/encaissements' | '/stock'
    urgent: boolean
  }[] = []

  agentDays.forEach((a) => {
    if (a.deliveryStatus === 'À valider') {
      tasks.push({
        id: `d-${a.agentId}`,
        label: `Valider la livraison de ${a.agent}`,
        detail: `${formatCurrency(a.expected)} attendu`,
        to: '/livraisons',
        urgent: true,
      })
    }
    if (a.deliveryStatus === 'Brouillon') {
      tasks.push({
        id: `b-${a.agentId}`,
        label: `Compléter la tournée de ${a.agent}`,
        detail: 'Quantités pas encore enregistrées',
        to: '/livraisons',
        urgent: false,
      })
    }
    if (a.collectionStatus === 'Soumis') {
      tasks.push({
        id: `c-${a.agentId}`,
        label: `Valider l’encaissement de ${a.agent}`,
        detail: `${formatCurrency(a.collected)} déclaré`,
        to: '/encaissements',
        urgent: true,
      })
    }
    if (a.deliveryStatus === 'Validé' && !a.hasCollection && a.expected > 0) {
      tasks.push({
        id: `e-${a.agentId}`,
        label: `Saisir l’argent de ${a.agent}`,
        detail: `${formatCurrency(a.expected)} à encaisser`,
        to: '/encaissements',
        urgent: true,
      })
    }
  })

  if (stats.lowStock > 0) {
    tasks.push({
      id: 'stock',
      label: `${stats.lowStock} produit(s) sous le seuil`,
      detail: 'Voir le stock',
      to: '/stock',
      urgent: false,
    })
  }

  return (
    <main className="page-content">
      <section className="money-strip" aria-label="Résumé du jour">
        <div className="money-strip__item">
          <span className="money-strip__label">Attendu aujourd&apos;hui</span>
          <span className="money-strip__value">{formatCurrency(stats.expected)}</span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Déjà reçu</span>
          <span className="money-strip__value money-strip__value--ok">
            {formatCurrency(stats.collected)}
          </span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Reste à encaisser</span>
          <span className="money-strip__value money-strip__value--warn">
            {formatCurrency(stats.remaining)}
          </span>
        </div>
      </section>

      <HelpNote>
        Commencez par les livraisons : quand vous validez une tournée, l’encaissement
        se crée automatiquement. Ensuite, saisissez l’argent reçu et validez.
      </HelpNote>

      <Card title="À faire maintenant">
        {tasks.length === 0 ? (
          <p className="empty-state">Rien en attente. Bonne journée !</p>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className="task-list__item">
                <div className="task-list__text">
                  <span className="task-list__label">{task.label}</span>
                  <span className="task-list__detail">{task.detail}</span>
                </div>
                {task.urgent ? <Badge variant="warning">Urgent</Badge> : null}
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => void navigate({ to: task.to })}
                >
                  Ouvrir
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section className="two-columns">
        <Card title="Agents du jour">
          <ul className="mini-agent-list">
            {agentDays.map((a) => (
              <li key={a.agentId}>
                <span className="mini-agent-list__name">{a.agent}</span>
                <span className="mini-agent-list__role">{a.role}</span>
                <span className="mini-agent-list__money">{formatCurrency(a.expected)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Étapes du jour">
          <ol className="steps-list">
            <li>
              <strong>Livraisons</strong> — noter ce qui est sorti et revenu
            </li>
            <li>
              <strong>Validation</strong> — verrouiller la tournée (crée l’encaissement)
            </li>
            <li>
              <strong>Encaissements</strong> — saisir l’argent reçu
            </li>
            <li>
              <strong>Clôture</strong> — valider pour la paie
            </li>
          </ol>
        </Card>
      </section>
    </main>
  )
}
