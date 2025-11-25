import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function AttendancePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Pointage
        </h1>
        <p className="text-stone-600">
          Suivez les présences, absences et retards de votre équipe.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pointage du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-stone-500 mb-4">
              Le système de pointage sera bientôt disponible.
            </p>
            <p className="text-sm text-stone-400">
              Cette section permettra de pointer les entrées et sorties,
              de consulter les historiques de présence, et de générer les rapports d'assiduité.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
