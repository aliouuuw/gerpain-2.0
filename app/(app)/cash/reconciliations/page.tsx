import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function ReconciliationsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Rapprochements
        </h1>
        <p className="text-stone-600">
          Historique des rapprochements de caisse et suivi des écarts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des rapprochements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-stone-500 mb-4">
              L'historique des rapprochements sera bientôt disponible.
            </p>
            <p className="text-sm text-stone-400">
              Cette section affichera l'historique des rapprochements de caisse,
              les écarts identifiés, et permettra d'exporter les rapports de caisse.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
