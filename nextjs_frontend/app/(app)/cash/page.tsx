"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card"

export default function CashPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-[var(--foreground)]">Caisse</h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Suivez les collectes de caisse et les écarts entre le théorique et le réel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Collectes de caisse</CardTitle>
            <CardDescription>
              Enregistrer les dépôts en fin de service.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--muted-foreground)]">
              <li>Montants attendus et réels par mode de paiement</li>
              <li>Association point de vente et période</li>
              <li>Rapports d&apos;écarts de caisse</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rapprochements</CardTitle>
            <CardDescription>
              Comparer encaissements et montants déposés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--muted-foreground)]">
              <li>Identification des écarts</li>
              <li>Statut des rapprochements</li>
              <li>Rapports de performance</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card variant="ghost" className="border border-dashed border-[var(--border)] bg-[var(--surface)]">
        <CardContent className="p-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Gestion complète de caisse et rapprochements à venir.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
