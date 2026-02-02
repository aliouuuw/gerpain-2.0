"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card"

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-[var(--foreground)]">Ventes</h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Suivez et enregistrez les ventes quotidiennes de vos points de vente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Saisie des ventes en caisse</CardTitle>
            <CardDescription>
              Enregistrer rapidement les ventes directes en magasin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--muted-foreground)]">
              <li>Produits fréquents en accès rapide</li>
              <li>Saisie par quantités avec calcul automatique</li>
              <li>Choix du mode de paiement</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Livraisons et commandes</CardTitle>
            <CardDescription>
              Suivi des commandes livrées aux clients et points de vente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--muted-foreground)]">
              <li>Vue des livraisons du jour</li>
              <li>Détail par client et produits livrés</li>
              <li>Préparation des données pour la facturation</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card variant="ghost" className="border border-dashed border-[var(--border)] bg-[var(--surface)]">
        <CardContent className="p-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Les fonctionnalités détaillées seront ajoutées progressivement.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
