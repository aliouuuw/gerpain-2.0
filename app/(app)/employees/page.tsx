"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card"

export default function EmployeesPage() {
  return (
    <div className="space-y-8">
      <div className="stagger-item">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Employés</h1>
        <p className="mt-2 text-stone-600">
          Visualisez vos équipes par chaîne et par point de vente. Cette page
          introduit les futures vues de liste et de pointage.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="stagger-item" style={{ animationDelay: "0.05s" }}>
          <CardHeader>
            <CardTitle>Liste des employés</CardTitle>
            <CardDescription>
              Vue d&apos;ensemble des collaborateurs de la chaîne et des points de
              vente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Informations de base (nom, poste, lieu d&apos;affectation)</li>
              <li>Filtrage par point de vente ou rôle</li>
              <li>Préparation aux actions de gestion RH (activations, droits)</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="stagger-item" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle>Pointage et présence</CardTitle>
            <CardDescription>
              Suivi des entrées et sorties pour la journée, par employé et par
              point de vente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm text-stone-600">
              <li>Boutons rapides de pointage entrée / sortie</li>
              <li>État de présence du jour (présent, absent, en retard)</li>
              <li>Préparation des synthèses journalières et hebdomadaires</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="stagger-item border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50" style={{ animationDelay: "0.15s" }}>
        <CardContent className="pt-6">
          <p className="text-sm text-stone-700">
            Les écrans complets de gestion des employés et de pointage seront
            développés dans les prochaines tranches. Cette page sert de point
            d&apos;entrée pour les fonctionnalités RH du système.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
