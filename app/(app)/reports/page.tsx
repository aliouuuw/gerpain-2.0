import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/Card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-[var(--foreground)]">
          Rapports
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Consultez les rapports de ventes, de stock et de performance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ventes</CardTitle>
            <CardDescription>
              Par période et par point de vente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[var(--muted-foreground)]">
              Bientôt disponible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock</CardTitle>
            <CardDescription>
              État des stocks et mouvements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[var(--muted-foreground)]">
              Bientôt disponible
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>
              Indicateurs par employé et point de vente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[var(--muted-foreground)]">
              Bientôt disponible
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
