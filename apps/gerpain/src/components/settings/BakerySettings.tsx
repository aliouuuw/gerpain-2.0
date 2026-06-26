import { Card } from '#/components/ui/Card'
import { useBakery } from '#/lib/bakery-context'

export function BakerySettings() {
  const { bakery, isLoading } = useBakery()

  return (
    <Card title="Boulangerie active" className="settings-section">
      {isLoading ? (
        <p className="settings-form__hint">Chargement…</p>
      ) : bakery ? (
        <dl className="settings-dl">
          <div className="settings-dl__row">
            <dt>Nom</dt>
            <dd>{bakery.name}</dd>
          </div>
          <div className="settings-dl__row">
            <dt>Code</dt>
            <dd>{bakery.code}</dd>
          </div>
          <div className="settings-dl__row">
            <dt>Adresse</dt>
            <dd>{bakery.address ?? '—'}</dd>
          </div>
          <div className="settings-dl__row">
            <dt>Téléphone</dt>
            <dd>{bakery.phone ?? '—'}</dd>
          </div>
        </dl>
      ) : (
        <p className="settings-form__hint">Aucune boulangerie sélectionnée.</p>
      )}
    </Card>
  )
}
