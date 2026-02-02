import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function EmployeesListPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Liste des employés
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Gérez les informations des employés, leurs rôles et leurs points de vente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Effectif de l'entreprise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-4">
              La gestion des employés sera bientôt disponible.
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Cette section permettra de consulter la liste des employés,
              de gérer leurs informations, rôles, et affectations aux points de vente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
