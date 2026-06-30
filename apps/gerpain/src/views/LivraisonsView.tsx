import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Fragment, useMemo, useState } from 'react'

import { DeliveryRunPanel } from '#/components/deliveries/DeliveryRunPanel'
import { Badge } from '#/components/ui/Badge'
import { Card } from '#/components/ui/Card'
import { HelpNote } from '#/components/ui/HelpNote'
import { useBakery } from '#/lib/bakery-context'
import {
  periodQty,
  runExpected,
} from '#/lib/day-operations'
import { formatXof } from '#/lib/format-money'
import { orpc } from '#/lib/orpc-client'
import { formatRpcError } from '#/lib/rpc-error'
import { runEntryProgress } from '#/lib/run-progress'
import { useShellDate } from '#/lib/use-shell-date'

const COL_COUNT = 6

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatDeliveryStatus(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Brouillon',
    in_progress: 'À valider',
    submitted: 'À valider',
    validated: 'Validé',
  }
  return labels[status] ?? status
}

function deliveryBadge(status: string) {
  const label = formatDeliveryStatus(status)
  switch (status) {
    case 'validated':
      return <Badge variant="success">{label}</Badge>
    case 'in_progress':
    case 'submitted':
      return <Badge variant="warning">{label}</Badge>
    case 'draft':
      return <Badge variant="neutral">{label}</Badge>
    default:
      return <Badge variant="neutral">{label}</Badge>
  }
}

export function LivraisonsView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { bakeryId, isLoading: bakeryLoading } = useBakery()
  const { operationalDate } = useShellDate()
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [prepareError, setPrepareError] = useState<string | null>(null)

  const runs = useQuery({
    ...orpc.deliveries.listRuns.queryOptions({
      input: { bakeryId, date: operationalDate },
    }),
    enabled: Boolean(bakeryId),
  })

  const prepareDay = useMutation(
    orpc.deliveries.prepareDay.mutationOptions({
      onMutate: () => setPrepareError(null),
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: orpc.deliveries.listRuns.key(),
        })
        void queryClient.invalidateQueries({
          queryKey: orpc.dashboard.dayActivity.key(),
        })
      },
      onError: (err) => setPrepareError(formatRpcError(err)),
    }),
  )

  const collections = useQuery({
    ...orpc.collections.list.queryOptions({
      input: { bakeryId, date: operationalDate },
    }),
    enabled: Boolean(bakeryId),
  })

  const collectionByRunId = useMemo(() => {
    const map = new Map<string, string>()
    for (const col of collections.data ?? []) {
      if (col.deliveryRunId) {
        map.set(col.deliveryRunId, col.id)
      }
    }
    return map
  }, [collections.data])

  const dayTotals = useMemo(() => {
    const list = runs.data ?? []
    return {
      count: list.length,
      expected: list.reduce((sum, run) => sum + runExpected(run.items), 0),
      drafts: list.filter((run) => run.status === 'draft').length,
      validated: list.filter((run) => run.status === 'validated').length,
    }
  }, [runs.data])

  return (
    <main className="page-content">
      {dayTotals.count > 0 ? (
        <section className="money-strip" aria-label="Résumé du jour">
          <div className="money-strip__item">
            <span className="money-strip__label">Tournées</span>
            <span className="money-strip__value">{dayTotals.count}</span>
          </div>
          <div className="money-strip__item">
            <span className="money-strip__label">CA attendu</span>
            <span className="money-strip__value">{formatXof(dayTotals.expected)}</span>
          </div>
          <div className="money-strip__item">
            <span className="money-strip__label">Brouillons</span>
            <span className="money-strip__value">{dayTotals.drafts}</span>
          </div>
          <div className="money-strip__item">
            <span className="money-strip__label">Validées</span>
            <span className="money-strip__value money-strip__value--ok">
              {dayTotals.validated}
            </span>
          </div>
        </section>
      ) : null}

      <HelpNote>
        Une ligne par agent. Saisissez confié et retour par produit (Matin /
        Soir), puis validez — l&apos;encaissement est créé automatiquement.
      </HelpNote>

      <Card>
        {!bakeryId || bakeryLoading || runs.isLoading ? (
          <p className="empty-state">Chargement des tournées…</p>
        ) : runs.isError ? (
          <p className="empty-state">Impossible de charger les livraisons.</p>
        ) : !runs.data || runs.data.length === 0 ? (
          <div className="prepare-day-cta" role="status">
            <p className="prepare-day-cta__title">Aucune tournée pour cette journée</p>
            <p className="prepare-day-cta__hint">
              Créez une ligne par livreur actif pour commencer la saisie Matin / Soir.
            </p>
            {prepareError ? (
              <p className="form-error" role="alert">
                {prepareError}
              </p>
            ) : null}
            <button
              type="button"
              className="btn-primary prepare-day-cta__btn"
              disabled={!bakeryId || prepareDay.isPending}
              onClick={() => {
                if (!bakeryId) return
                prepareDay.mutate({ bakeryId, date: operationalDate })
              }}
            >
              {prepareDay.isPending ? 'Préparation…' : 'Préparer les tournées'}
            </button>
          </div>
        ) : (
          <table className="data-table data-table--expandable">
            <thead>
              <tr>
                <th>Agent & Secteur</th>
                <th>Saisie</th>
                <th>Volume (unités)</th>
                <th>CA attendu</th>
                <th>Encaissement</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {runs.data.map((run) => {
                const matinQty = periodQty(run.items, 'matin')
                const soirQty = periodQty(run.items, 'soir')
                const expected = runExpected(run.items)
                const progress = runEntryProgress(run.items)
                const collectionId = collectionByRunId.get(run.id)
                const hasCollection = Boolean(collectionId)
                const isSelected = selectedRunId === run.id

                return (
                  <Fragment key={run.id}>
                    <tr
                      className={`clickable-row ${isSelected ? 'data-table__row--selected' : ''}`}
                      tabIndex={0}
                      role="button"
                      aria-expanded={isSelected}
                      onClick={() => setSelectedRunId(isSelected ? null : run.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedRunId(isSelected ? null : run.id)
                        }
                      }}
                    >
                      <td>
                        <div className="agent-lockup">
                          <div className="avatar--sm">{getInitials(run.employeeName)}</div>
                          <div className="agent-lockup__info">
                            <div className="agent-name">{run.employeeName}</div>
                            <div className="agent-role">{run.locationName}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {run.status === 'draft' ? (
                          <div className="progress-cell mt-1">
                            <span className="progress-cell__text">
                              {progress.entered} / {progress.total} saisis
                            </span>
                            <div className="progress-bar">
                              <div
                                className="progress-bar__fill"
                                style={{
                                  width: `${(progress.entered / Math.max(1, progress.total)) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="cell-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="volume-badges">
                          {matinQty > 0 && <span className="badge-pill">Matin: {matinQty}</span>}
                          {soirQty > 0 && <span className="badge-pill">Soir: {soirQty}</span>}
                          {matinQty === 0 && soirQty === 0 && <span className="cell-muted">—</span>}
                        </div>
                      </td>
                      <td className="cell-money">
                        {expected > 0 ? formatXof(expected) : '—'}
                      </td>
                      <td>
                        {hasCollection && collectionId ? (
                          <button
                            type="button"
                            className="link-btn link-btn--strong"
                            onClick={(e) => {
                              e.stopPropagation()
                              void navigate({
                                to: '/encaissements',
                                search: {
                                  employee: run.employeeId,
                                  period: 'custom',
                                  start: operationalDate,
                                  end: operationalDate,
                                },
                              })
                            }}
                          >
                            Voir l&apos;encaissement →
                          </button>
                        ) : (
                          <span className="cell-muted">Après validation</span>
                        )}
                      </td>
                      <td>
                        <div className="status-cell">
                          {deliveryBadge(run.status)}
                          <span className="status-cell__chevron">
                            {isSelected ? '▲' : '▼'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {isSelected && bakeryId ? (
                      <tr className="data-table__expand-row">
                        <td colSpan={COL_COUNT}>
                          <DeliveryRunPanel
                            inline
                            runId={run.id}
                            bakeryId={bakeryId}
                            onClose={() => setSelectedRunId(null)}
                            onValidated={() => {
                              void runs.refetch()
                              void collections.refetch()
                            }}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </main>
  )
}
