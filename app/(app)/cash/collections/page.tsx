import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function CollectionsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Encaissements
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Suivez les collectes d'espèces des livreurs et rapprochez les fonds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collectes du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-4">
              La gestion des encaissements sera bientôt disponible.
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Cette section permettra de saisir les collectes d'espèces par livreur,
              de suivre les montants attendus vs réels, et de gérer les rapprochements.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
