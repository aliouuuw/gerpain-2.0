import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

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
import { useShellDate } from '#/lib/use-shell-date'

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
  const { bakeryId, isLoading: bakeryLoading } = useBakery()
  const { operationalDate } = useShellDate()
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)

  const runs = useQuery({
    ...orpc.deliveries.listRuns.queryOptions({
      input: { bakeryId, date: operationalDate },
    }),
    enabled: Boolean(bakeryId),
  })

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

  return (
    <main className="page-content">
      <HelpNote>
        Une ligne par agent. Saisissez confié et retour par produit (Matin /
        Soir), puis validez — l&apos;encaissement est créé automatiquement.
      </HelpNote>

      <Card>
        {bakeryLoading || runs.isLoading ? (
          <p className="empty-state">Chargement des tournées…</p>
        ) : runs.isError ? (
          <p className="empty-state">Impossible de charger les livraisons.</p>
        ) : !runs.data || runs.data.length === 0 ? (
          <p className="empty-state">Aucune tournée pour cette journée.</p>
        ) : (
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
              {runs.data.map((run) => {
                const matinQty = periodQty(run.items, 'matin')
                const soirQty = periodQty(run.items, 'soir')
                const expected = runExpected(run.items)
                const collectionId = collectionByRunId.get(run.id)
                const hasCollection = Boolean(collectionId)
                const isSelected = selectedRunId === run.id

                return (
                  <tr
                    key={run.id}
                    className={isSelected ? 'data-table__row--selected' : undefined}
                  >
                    <td>
                      <span className="cell-agent">{run.employeeName}</span>
                      <span className="cell-sub">{run.locationName}</span>
                    </td>
                    <td>
                      {matinQty > 0 && <span>Matin {matinQty}</span>}
                      {matinQty > 0 && soirQty > 0 && ' · '}
                      {soirQty > 0 && <span>Soir {soirQty}</span>}
                      {matinQty === 0 && soirQty === 0 && '—'}
                    </td>
                    <td className="cell-money">
                      {expected > 0 ? formatXof(expected) : '—'}
                    </td>
                    <td>
                      {hasCollection && collectionId ? (
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() =>
                            void navigate({ to: '/encaissements' })
                          }
                        >
                          Voir l&apos;encaissement →
                        </button>
                      ) : (
                        <span className="cell-muted">Après validation</span>
                      )}
                    </td>
                    <td>{deliveryBadge(run.status)}</td>
                    <td>
                      <button
                        type="button"
                        className={`table-action${!isSelected && run.status !== 'validated' ? ' table-action--primary' : ''}`}
                        onClick={() =>
                          setSelectedRunId(isSelected ? null : run.id)
                        }
                      >
                        {isSelected
                          ? 'Fermer'
                          : run.status === 'validated'
                            ? 'Voir'
                            : 'Saisir'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {selectedRunId && bakeryId ? (
        <DeliveryRunPanel
          runId={selectedRunId}
          bakeryId={bakeryId}
          onClose={() => setSelectedRunId(null)}
          onValidated={() => {
            void runs.refetch()
            void collections.refetch()
          }}
        />
      ) : null}
    </main>
  )
}
