import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

export default function ProductsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Produits
        </h1>
        <p className="text-stone-600">
          Gérez votre catalogue de produits : prix, unités, et disponibilité.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalogue des produits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-stone-500 mb-4">
              La gestion des produits sera bientôt disponible.
            </p>
            <p className="text-sm text-stone-400">
              Cette section permettra de gérer les prix, les unités de mesure, 
              et la disponibilité des produits par point de vente.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
