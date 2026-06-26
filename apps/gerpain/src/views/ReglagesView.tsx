import { LocationsSettings } from '#/components/settings/LocationsSettings'
import { Card } from '#/components/ui/Card'
import { useBakery } from '#/lib/bakery-context'

export function ReglagesView() {
  const { bakery, isLoading } = useBakery()

  return (
    <main className="page-content">
      <section className="settings-grid">
        <Card title="Boulangerie active">
          {isLoading ? (
            <p className="settings-form__hint">Chargement…</p>
          ) : bakery ? (
            <>
              <div className="setting-row">
                <span className="setting-label">Nom</span>
                <span className="setting-value">{bakery.name}</span>
              </div>
              <div className="setting-row">
                <span className="setting-label">Code</span>
                <span className="setting-value">{bakery.code}</span>
              </div>
              <div className="setting-row">
                <span className="setting-label">Adresse</span>
                <span className="setting-value">
                  {bakery.address ?? '—'}
                </span>
              </div>
              <div className="setting-row">
                <span className="setting-label">Téléphone</span>
                <span className="setting-value">{bakery.phone ?? '—'}</span>
              </div>
            </>
          ) : (
            <p className="settings-form__hint">Aucune boulangerie sélectionnée.</p>
          )}
        </Card>

        <LocationsSettings />

        <Card title="Notifications">
          <div className="setting-row">
            <span className="setting-label">Alertes stock</span>
            <span className="setting-value">Activées</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Rappels encaissements</span>
            <span className="setting-value">Activés</span>
          </div>
        </Card>
      </section>
    </main>
  )
}
