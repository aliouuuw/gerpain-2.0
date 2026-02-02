import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function ReconciliationsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Rapprochements
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Historique des rapprochements de caisse et suivi des écarts.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des rapprochements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-4">
              L&apos;historique des rapprochements sera bientôt disponible.
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Cette section affichera l&apos;historique des rapprochements de caisse,
              les écarts identifiés, et permettra d&apos;exporter les rapports de caisse.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
