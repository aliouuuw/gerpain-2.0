import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function ProductsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          Produits
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Gérez votre catalogue de produits : prix, unités, et disponibilité.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalogue des produits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-[var(--muted-foreground)] mb-4">
              La gestion des produits sera bientôt disponible.
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Cette section permettra de gérer les prix, les unités de mesure, 
              et la disponibilité des produits par point de vente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
