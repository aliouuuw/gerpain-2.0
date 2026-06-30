import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'

import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { formatXof } from '#/lib/format-money'
import { useBakery } from '#/lib/bakery-context'
import { orpc } from '#/lib/orpc-client'
import { formatRpcError } from '#/lib/rpc-error'
import { useDayData } from '#/lib/use-day-data'
import { usePermissions } from '#/lib/use-permissions'
import { todayIso } from '#/lib/today'

export function HomeView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { bakeryId } = useBakery()
  const { stats, tasks, agents, isLoading, isError } = useDayData()
  const { canManageCollections } = usePermissions()

  const dashboard = useQuery({
    ...orpc.dashboard.summary.queryOptions({
      input: { bakeryId, date: todayIso() },
    }),
    enabled: Boolean(bakeryId),
  })

  const prepareDay = useMutation(
    orpc.deliveries.prepareDay.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: orpc.deliveries.listRuns.key(),
        })
        void queryClient.invalidateQueries({
          queryKey: orpc.dashboard.dayActivity.key(),
        })
      },
    }),
  )

  const visibleTasks = tasks.filter(
    (task) => !task.id.startsWith('c-') || canManageCollections,
  )

  const ledger = dashboard.data?.ledger
  const today = dashboard.data?.today
  const showReconciliationsCue =
    canManageCollections &&
    (today?.unsettledValidatedCount ?? 0) > 0

  function openTask(task: (typeof visibleTasks)[number]) {
    if (task.action === 'prepare-day') {
      if (!bakeryId) return
      prepareDay.mutate(
        { bakeryId, date: todayIso() },
        {
          onSuccess: () => {
            void navigate({ to: '/livraisons' })
          },
          onError: () => {
            void navigate({ to: '/livraisons' })
          },
        },
      )
      return
    }

    if (task.to === '/livraisons' && task.runId) {
      void navigate({ to: '/livraisons', search: { run: task.runId } })
      return
    }

    if (task.to === '/encaissements' && task.employeeId) {
      void navigate({
        to: '/encaissements',
        search: { employee: task.employeeId, period: 'week' },
      })
      return
    }

    void navigate({ to: task.to })
  }

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

      <section className="money-strip money-strip--ledger" aria-label="Soldes">
        <div className="money-strip__item">
          <span className="money-strip__label">Argent en caisse</span>
          <span className="money-strip__value">
            {dashboard.isLoading ? '…' : formatXof(ledger?.cashBalance ?? 0)}
          </span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Reste à récupérer (livreurs)</span>
          <span className="money-strip__value money-strip__value--warn">
            {dashboard.isLoading
              ? '…'
              : formatXof(ledger?.driverReceivableBalance ?? 0)}
          </span>
        </div>
        <div className="money-strip__item">
          <span className="money-strip__label">Validés, pas encore clôturés</span>
          <span className="money-strip__value">
            {dashboard.isLoading
              ? '…'
              : `${today?.unsettledValidatedCount ?? 0} · ${formatXof(today?.unsettledValidatedAmount ?? 0)}`}
          </span>
        </div>
      </section>

      {showReconciliationsCue ? (
        <Card>
          <p className="home-reconcile-cue">
            {today?.unsettledValidatedCount ?? 0} encaissement
            {(today?.unsettledValidatedCount ?? 0) > 1 ? 's' : ''} validé
            {(today?.unsettledValidatedCount ?? 0) > 1 ? 's' : ''} attendent la
            clôture paie.{' '}
            <Link to="/reconciliations" className="text-link">
              Voir les réconciliations →
            </Link>
          </p>
        </Card>
      ) : null}

      <HelpNote>
        Commencez par les livraisons : quand vous validez une tournée, l’encaissement
        se crée automatiquement. Ensuite, saisissez l’argent reçu et validez.
      </HelpNote>

      <Card title="À faire maintenant">
        {prepareDay.isError ? (
          <p className="form-error" role="alert">
            {formatRpcError(prepareDay.error)}
          </p>
        ) : null}
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
                  disabled={task.action === 'prepare-day' && prepareDay.isPending}
                  onClick={() => openTask(task)}
                >
                  {task.action === 'prepare-day' && prepareDay.isPending
                    ? 'Préparation…'
                    : 'Ouvrir'}
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
            <p className="empty-state">
              Aucune tournée préparée. Utilisez « Préparer les tournées » sur
              Livraisons.
            </p>
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
              <strong>Préparer</strong> — créer les tournées du jour
            </li>
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
