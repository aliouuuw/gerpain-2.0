import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Rapports
        </h1>
        <p className="text-stone-600">
          Consultez les rapports de ventes, de stock et de performance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ventes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-600 mb-4">
              Rapports de ventes par période et par point de vente.
            </p>
            <p className="text-xs text-stone-400">
              Bientôt disponible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-600 mb-4">
              État des stocks et mouvements de produits.
            </p>
            <p className="text-xs text-stone-400">
              Bientôt disponible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-stone-600 mb-4">
              Indicateurs de performance par employé et par point de vente.
            </p>
            <p className="text-xs text-stone-400">
              Bientôt disponible
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
