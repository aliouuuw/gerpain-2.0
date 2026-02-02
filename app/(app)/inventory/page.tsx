"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card"

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-[var(--foreground)]">
          Stock / Inventaire
        </h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Surveillez les niveaux de stock et préparez les ajustements nécessaires.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ajustements de stock</CardTitle>
            <CardDescription>
              Enregistrer les entrées et sorties de stock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--muted-foreground)]">
              <li>Corrections après inventaire physique</li>
              <li>Pertes, casses et dons</li>
              <li>Historique des mouvements</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transferts entre points de vente</CardTitle>
            <CardDescription>
              Suivre les mouvements de stock entre magasins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--muted-foreground)]">
              <li>Transferts sortants et entrants</li>
              <li>Suivi des quantités</li>
              <li>Rapports de mouvement</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card variant="ghost" className="border border-dashed border-[var(--border)] bg-[var(--surface)]">
        <CardContent className="p-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Vues du stock critique et seuils de réapprovisionnement à venir.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
