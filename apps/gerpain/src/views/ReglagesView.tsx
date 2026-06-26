import { Card } from '#/components/ui/Card'
import { bakery } from '#/mock/operational'

export function ReglagesView() {
  return (
    <main className="page-content">
      <section className="settings-grid">
        <Card title="Boulangerie">
          <div className="setting-row">
            <span className="setting-label">Nom</span>
            <span className="setting-value">{bakery.name}</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Dépôt</span>
            <span className="setting-value">{bakery.location}</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Téléphone</span>
            <span className="setting-value">+221 33 000 00 00</span>
          </div>
        </Card>

        <Card title="Prix des produits">
          <div className="setting-row">
            <span className="setting-label">Pain Kilo</span>
            <span className="setting-value">1 500 F</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Pain Moyen</span>
            <span className="setting-value">250 F</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Pain Petit</span>
            <span className="setting-value">150 F</span>
          </div>
          <div className="setting-row">
            <span className="setting-label">Croissant</span>
            <span className="setting-value">400 F</span>
          </div>
        </Card>

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
