import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function InventoryTransfersPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Transferts de stock
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Transférez des produits entre vos différents points de vente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau transfert</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-4">
              Les transferts de stock seront bientôt disponibles.
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Cette section permettra d&apos;initier des transferts entre points de vente,
              de suivre les mouvements en transit, et de valider les réceptions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
