import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function InventoryAdjustmentsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Ajustements de stock
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Enregistrez les entrées et sorties de stock manuelles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouvel ajustement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-4">
              Les ajustements de stock seront bientôt disponibles.
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Cette section permettra de saisir les ajustements manuels de stock,
              de corriger les écarts d'inventaire, et de suivre les mouvements exceptionnels.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
