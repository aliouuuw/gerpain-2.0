"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card"

export default function SalesPage() {
  return (
    <div className="space-y-8">
      <div className="stagger-item">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Ventes</h1>
        <p className="mt-2 text-stone-600">
          Suivez et enregistrez les ventes quotidiennes de vos points de vente. Cette
          page regroupera les principaux écrans de saisie pour la caisse et les
          livraisons.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="stagger-item" style={{ animationDelay: "0.05s" }}>
          <CardHeader>
            <CardTitle>Saisie des ventes en caisse</CardTitle>
            <CardDescription>
              Écran principal pour enregistrer rapidement les ventes directes en
              magasin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Produits fréquents en accès rapide (Pain kilo, viennoiseries…)</li>
              <li>Saisie par quantités avec calcul automatique du total</li>
              <li>Choix du mode de paiement et récapitulatif de la vente</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="stagger-item" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle>Livraisons et commandes</CardTitle>
            <CardDescription>
              Suivi des commandes livrées aux clients professionnels et aux autres
              points de vente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Vue des livraisons du jour et de la tournée</li>
              <li>Détail par client, produits livrés et montants</li>
              <li>Préparation des données pour la facturation et le reporting</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="stagger-item border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50" style={{ animationDelay: "0.15s" }}>
        <CardContent className="pt-6">
          <p className="text-sm text-stone-700">
            Les fonctionnalités détaillées de saisie des ventes seront ajoutées au
            fur et à mesure de l&apos;implémentation du MVP. Cette page sert de
            point d&apos;entrée pour les flux quotidiens de vente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
