import { useNavigate } from '@tanstack/react-router'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { formatXof } from '#/lib/format-money'
import { useDayData } from '#/lib/use-day-data'
import { usePermissions } from '#/lib/use-permissions'

export function HomeView() {
  const navigate = useNavigate()
  const { stats, tasks, agents, isLoading, isError } = useDayData()
  const { canManageCollections } = usePermissions()

  const visibleTasks = tasks.filter(
    (task) => !task.id.startsWith('c-') || canManageCollections,
  )

  return (
    <main className="page-content">
      <section className="money-strip" aria-label="Résumé du jour">
        <div className="money-strip__item">
          <span className="money-strip__label">Attendu aujourd&apos;hui</span>
          <span className="money-strip__value">
            {isLoading ? '…' : formatXof(stats.expected)}
          </span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Déjà reçu</span>
          <span className="money-strip__value money-strip__value--ok">
            {isLoading ? '…' : formatXof(stats.collected)}
          </span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Reste à encaisser</span>
          <span className="money-strip__value money-strip__value--warn">
            {isLoading ? '…' : formatXof(stats.remaining)}
          </span>
        </div>
      </section>

      <HelpNote>
        Commencez par les livraisons : quand vous validez une tournée, l’encaissement
        se crée automatiquement. Ensuite, saisissez l’argent reçu et validez.
      </HelpNote>

      <Card title="À faire maintenant">
        {isLoading ? (
          <p className="empty-state">Chargement des tâches du jour…</p>
        ) : isError ? (
          <p className="empty-state">Impossible de charger les données du jour.</p>
        ) : visibleTasks.length === 0 ? (
          <p className="empty-state">Rien en attente. Bonne journée !</p>
        ) : (
          <ul className="task-list">
            {visibleTasks.map((task) => (
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
          {isLoading ? (
            <p className="empty-state">Chargement…</p>
          ) : agents.length === 0 ? (
            <p className="empty-state">Aucun agent actif aujourd&apos;hui.</p>
          ) : (
            <ul className="mini-agent-list">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <span className="mini-agent-list__name">{agent.name}</span>
                  <span className="mini-agent-list__role">{agent.subtitle}</span>
                  <span className="mini-agent-list__money">
                    {agent.expected > 0 ? formatXof(agent.expected) : '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
