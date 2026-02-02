"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card"

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-[var(--foreground)]">Employés</h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Visualisez vos équipes par chaîne et par point de vente.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Liste des employés</CardTitle>
            <CardDescription>
              Vue d'ensemble des collaborateurs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--muted-foreground)]">
              <li>Informations de base (nom, poste, affectation)</li>
              <li>Filtrage par point de vente ou rôle</li>
              <li>Actions de gestion RH</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pointage et présence</CardTitle>
            <CardDescription>
              Suivi des entrées et sorties du jour.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[var(--muted-foreground)]">
              <li>Pointage entrée / sortie rapide</li>
              <li>État de présence (présent, absent, en retard)</li>
              <li>Synthèses journalières</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card variant="ghost" className="border border-dashed border-[var(--border)] bg-[var(--surface)]">
        <CardContent className="p-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Gestion complète des employés et pointage à venir.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
