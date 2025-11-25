import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function EmployeesListPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Liste des employés
        </h1>
        <p className="text-stone-600">
          Gérez les informations des employés, leurs rôles et leurs points de vente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Effectif de l'entreprise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-stone-500 mb-4">
              La gestion des employés sera bientôt disponible.
            </p>
            <p className="text-sm text-stone-400">
              Cette section permettra de consulter la liste des employés,
              de gérer leurs informations, rôles, et affectations aux points de vente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
