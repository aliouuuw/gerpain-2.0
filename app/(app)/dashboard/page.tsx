"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/Card"
import { Button } from "@/components/Button"
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Users, 
  Truck, 
  Banknote,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CircleDot
} from "lucide-react"
import Link from "next/link"

const stats = [
  {
    title: "Ventes du jour",
    value: "847 500",
    unit: "FCFA",
    change: "+12.3%",
    trend: "up" as const,
    icon: Banknote,
    description: "vs. hier",
  },
  {
    title: "Livraisons",
    value: "24",
    unit: "tournées",
    change: "+3",
    trend: "up" as const,
    icon: Truck,
    description: "en cours aujourd'hui",
  },
  {
    title: "Stock critique",
    value: "7",
    unit: "articles",
    change: "-2",
    trend: "down" as const,
    icon: Package,
    description: "à réapprovisionner",
  },
  {
    title: "Équipe",
    value: "18",
    unit: "présents",
    change: "100%",
    trend: "neutral" as const,
    icon: Users,
    description: "taux de présence",
  },
]

const quickActions = [
  { label: "Nouvelle livraison", href: "/sales/deliveries", icon: Truck },
  { label: "Collecte caisse", href: "/cash/collections", icon: Banknote },
  { label: "Ajuster stock", href: "/inventory/adjustments", icon: Package },
]

const recentActivity = [
  { label: "Livraison validée – Ali", time: "Il y a 5 min", status: "success" },
  { label: "Collecte en attente – Moussa", time: "Il y a 12 min", status: "pending" },
  { label: "Stock mis à jour: Farine T65", time: "Il y a 23 min", status: "info" },
  { label: "Pointage: Marie D.", time: "Il y a 45 min", status: "info" },
]

const alerts = [
  { label: "Stock de levure faible", severity: "urgent" as const },
  { label: "3 collectes en attente de validation", severity: "warning" as const },
  { label: "Maintenance four prévue demain", severity: "info" as const },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl text-[var(--foreground)]">
            Tableau de bord
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
            Vue d&apos;ensemble de vos opérations · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex gap-2">
          {quickActions.map((action) => (
            <Button key={action.label} variant="secondary" size="sm" asChild>
              <Link href={action.href} className="gap-1.5">
                <action.icon className="size-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          const isPositive = stat.trend === "up"
          const isNegative = stat.trend === "down"

          return (
            <Card key={stat.title} className="group relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-[var(--muted-foreground)]">
                      {stat.title}
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
                        {stat.value}
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {stat.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      {stat.trend !== "neutral" && (
                        <>
                          {isPositive && <TrendingUp className="size-3 text-[var(--primary)]" />}
                          {isNegative && <TrendingDown className="size-3 text-[var(--error)]" />}
                          <span className={isPositive ? "font-medium text-[var(--primary)]" : isNegative ? "font-medium text-[var(--error)]" : ""}>
                            {stat.change}
                          </span>
                        </>
                      )}
                      <span className="text-[var(--muted-foreground)]">{stat.description}</span>
                    </div>
                  </div>
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)] transition-colors">
                    <Icon className="size-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Activité récente</CardTitle>
              <CardDescription>Dernières opérations du système</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-xs">
              Voir tout
              <ArrowRight className="ml-1 size-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {recentActivity.map((activity, i) => (
                <div 
                  key={i} 
                  className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--secondary)]/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`flex size-7 items-center justify-center rounded-full ${
                      activity.status === "success" ? "bg-[var(--primary-subtle)] text-[var(--primary)]" :
                      activity.status === "pending" ? "bg-[var(--warning-subtle)] text-[var(--warning)]" :
                      "bg-[var(--secondary)] text-[var(--muted-foreground)]"
                    }`}>
                      {activity.status === "success" && <CheckCircle2 className="size-3.5" />}
                      {activity.status === "pending" && <Clock className="size-3.5" />}
                      {activity.status === "info" && <CircleDot className="size-3.5" />}
                    </div>
                    <span className="text-sm text-[var(--foreground)]">
                      {activity.label}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-[var(--warning)]" />
              Alertes
            </CardTitle>
            <CardDescription>Points d&apos;attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2.5 ${
                    alert.severity === "urgent" ? "bg-[var(--error-subtle)] text-[var(--error)]" :
                    alert.severity === "warning" ? "bg-[var(--warning-subtle)] text-[var(--warning)]" :
                    "bg-[var(--info-subtle)] text-[var(--info)]"
                  }`}
                >
                  <p className="text-sm font-medium">{alert.label}</p>
                  <p className="mt-0.5 text-xs opacity-75">
                    {alert.severity === "urgent" && "Action immédiate"}
                    {alert.severity === "warning" && "À traiter aujourd'hui"}
                    {alert.severity === "info" && "Pour information"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Development Notice */}
      <Card variant="ghost" className="border border-dashed border-[var(--border)] bg-[var(--surface)]">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary-subtle)] text-[var(--primary)]">
            <Package className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Système en développement
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
              Ce tableau de bord sera enrichi avec des graphiques et analyses avancées.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0">
            En savoir plus
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
