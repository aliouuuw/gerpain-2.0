"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card"
import { TrendingUp, TrendingDown, Package, Users, ShoppingCart, Euro } from "lucide-react"

export default function DashboardPage() {
  const stats = [
    {
      title: "Ventes du jour",
      value: "€2,847",
      change: "+12.3%",
      trend: "up",
      icon: Euro,
      description: "Par rapport à hier",
    },
    {
      title: "Commandes",
      value: "142",
      change: "+8.1%",
      trend: "up",
      icon: ShoppingCart,
      description: "Commandes actives",
    },
    {
      title: "Stock critique",
      value: "23",
      change: "-5.2%",
      trend: "down",
      icon: Package,
      description: "Articles à réapprovisionner",
    },
    {
      title: "Équipe présente",
      value: "18",
      change: "0%",
      trend: "neutral",
      icon: Users,
      description: "Employés actifs aujourd'hui",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="stagger-item">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">
          Tableau de bord
        </h1>
        <p className="mt-2 text-stone-600">
          Vue d'ensemble de vos opérations de boulangerie en temps réel
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const isPositive = stat.trend === "up"
          const TrendIcon = isPositive ? TrendingUp : TrendingDown

          return (
            <Card
              key={stat.title}
              className="stagger-item overflow-hidden transition-all hover:scale-105"
              style={{ animationDelay: `${(index + 1) * 0.05}s` }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-stone-600">
                  {stat.title}
                </CardTitle>
                <div className="rounded-md bg-amber-100 p-2">
                  <Icon className="size-4 text-amber-700" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-stone-900">
                  {stat.value}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs">
                  {stat.trend !== "neutral" && (
                    <>
                      <TrendIcon
                        className={`size-3 ${
                          isPositive
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      />
                      <span
                        className={`font-medium ${
                          isPositive
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {stat.change}
                      </span>
                    </>
                  )}
                  <span className="text-stone-500">
                    {stat.description}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="stagger-item" style={{ animationDelay: "0.3s" }}>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
            <CardDescription>
              Dernières actions dans votre système
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Nouvelle commande #1847", time: "Il y a 5 min", color: "bg-emerald-100 text-emerald-700" },
                { label: "Stock mis à jour: Farine T65", time: "Il y a 12 min", color: "bg-blue-100 text-blue-700" },
                { label: "Employé pointé: Marie D.", time: "Il y a 23 min", color: "bg-purple-100 text-purple-700" },
                { label: "Rapport de vente généré", time: "Il y a 1h", color: "bg-amber-100 text-amber-700" },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between border-b border-stone-100 pb-3 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${activity.color.split(' ')[0]}`} />
                    <span className="text-sm font-medium text-stone-900">
                      {activity.label}
                    </span>
                  </div>
                  <span className="text-xs text-stone-500">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="stagger-item" style={{ animationDelay: "0.35s" }}>
          <CardHeader>
            <CardTitle>Alertes</CardTitle>
            <CardDescription>
              Points d'attention nécessitant votre action
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Stock de levure faible", severity: "urgent", color: "bg-red-100 text-red-700" },
                { label: "Planification hebdomadaire incomplète", severity: "important", color: "bg-orange-100 text-orange-700" },
                { label: "Maintenance four prévue demain", severity: "info", color: "bg-blue-100 text-blue-700" },
              ].map((alert, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 ${alert.color}`}
                >
                  <p className="text-sm font-medium">{alert.label}</p>
                  <p className="mt-1 text-xs opacity-80">
                    {alert.severity === "urgent" && "Action immédiate requise"}
                    {alert.severity === "important" && "À traiter aujourd'hui"}
                    {alert.severity === "info" && "Pour information"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Footer */}
      <Card className="stagger-item border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50" style={{ animationDelay: "0.4s" }}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-amber-100 p-3">
              <Package className="size-6 text-amber-700" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-900">
                Système en développement
              </h3>
              <p className="mt-1 text-sm text-stone-600">
                Cette page sera enrichie avec des graphiques détaillés, des indicateurs de performance et des analyses avancées au fur et à mesure de l'implémentation du MVP.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
