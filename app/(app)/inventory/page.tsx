"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card"

export default function InventoryPage() {
  return (
    <div className="space-y-8">
      <div className="stagger-item">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Stock / Inventaire
        </h1>
        <p className="mt-2 text-stone-600">
          Surveillez les niveaux de stock de vos produits et préparez les
          ajustements nécessaires. Cette page centralisera les actions
          d&apos;inventaire pour vos points de vente.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="stagger-item" style={{ animationDelay: "0.05s" }}>
          <CardHeader>
            <CardTitle>Ajustements de stock</CardTitle>
            <CardDescription>
              Enregistrer les entrées et sorties de stock directement depuis le
              point de vente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Corrections après inventaire physique</li>
              <li>Pertes, casses et dons</li>
              <li>Historique des mouvements pour chaque article</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="stagger-item" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle>Transferts entre points de vente</CardTitle>
            <CardDescription>
              Suivre les mouvements de stock entre vos magasins et le
              laboratoire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Création de transferts sortants et entrants</li>
              <li>Suivi des quantités et de la destination</li>
              <li>Préparation des rapports de mouvement de stock</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="stagger-item border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50" style={{ animationDelay: "0.15s" }}>
        <CardContent className="pt-6">
          <p className="text-sm text-stone-700">
            Les vues détaillées du stock critique et des seuils de
            réapprovisionnement seront ajoutées progressivement. Cette page
            servira de point d&apos;accès principal pour vos décisions
            d&apos;approvisionnement.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
