import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function CollectionsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Encaissements
        </h1>
        <p className="text-stone-600">
          Suivez les collectes d'espèces des livreurs et rapprochez les fonds.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Collectes du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-stone-500 mb-4">
              La gestion des encaissements sera bientôt disponible.
            </p>
            <p className="text-sm text-stone-400">
              Cette section permettra de saisir les collectes d'espèces par livreur,
              de suivre les montants attendus vs réels, et de gérer les rapprochements.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
