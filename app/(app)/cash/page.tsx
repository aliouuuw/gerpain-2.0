"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card"

export default function CashPage() {
  return (
    <div className="space-y-8">
      <div className="stagger-item">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Caisse</h1>
        <p className="mt-2 text-stone-600">
          Suivez les collectes de caisse et les écarts entre le théorique et le
          réel. Cette page préparera les écrans de rapprochement et de
          consolidation.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="stagger-item" style={{ animationDelay: "0.05s" }}>
          <CardHeader>
            <CardTitle>Collectes de caisse</CardTitle>
            <CardDescription>
              Enregistrer les dépôts de caisse en fin de service ou de journée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Saisir les montants attendus et réels par mode de paiement</li>
              <li>Associer chaque collecte à un point de vente et une période</li>
              <li>Préparer la base pour les rapports d&apos;écarts de caisse</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="stagger-item" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle>Rapprochements</CardTitle>
            <CardDescription>
              Comparer les encaissements saisis avec les montants déposés et les
              relevés bancaires.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Identifier rapidement les écarts à investiguer</li>
              <li>Suivre le statut des rapprochements (en attente, rapproché)</li>
              <li>Alimenter les rapports de performance par point de vente</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="stagger-item border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50" style={{ animationDelay: "0.15s" }}>
        <CardContent className="pt-6">
          <p className="text-sm text-stone-700">
            Les écrans complets de gestion de caisse seront construits au fil de
            l&apos;avancement du MVP. Cette page introduit les concepts clés de
            collecte et de rapprochement.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
