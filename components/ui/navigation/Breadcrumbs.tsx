"use client"

import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const segmentLabels: Record<string, string> = {
  dashboard: "Tableau de bord",
  sales: "Ventes",
  inventory: "Stock / Inventaire",
  cash: "Caisse",
  employees: "Employés",
  transactions: "Saisie des ventes",
  deliveries: "Livraisons",
  adjustments: "Ajustements",
  transfers: "Transferts",
  collections: "Collectes",
  reconciliations: "Rapprochements",
  list: "Liste",
  attendance: "Pointage",
}

type Crumb = {
  key: string
  href: string
  label: string
}

function buildBreadcrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean)

  // Always start from dashboard as logical home in the app area
  const crumbs: Crumb[] = [
    { key: "home", href: "/dashboard", label: "Accueil" },
  ]

  let currentPath = ""

  for (const segment of segments) {
    if (segment === "app" || segment === "auth") continue

    currentPath += `/${segment}`

    const label = segmentLabels[segment]
    if (!label) continue

    const href = currentPath || "/"

    // avoid duplicate crumbs for the same href + label
    if (crumbs.some((c) => c.href === href && c.label === label)) {
      continue
    }

    crumbs.push({ key: `segment-${segment}-${href}`, href, label })
  }

  // If we are on /, treat it as /dashboard for breadcrumbs
  if (segments.length === 0) {
    crumbs.push({ key: "dashboard", href: "/dashboard", label: "Tableau de bord" })
  }

  return crumbs
}

export function Breadcrumbs() {
  const pathname = usePathname() ?? "/dashboard"
  const crumbs = buildBreadcrumbs(pathname)

  if (crumbs.length === 0) return null

  const lastIndex = crumbs.length - 1

  return (
    <nav aria-label="Breadcrumb" className="ml-2">
      <ol role="list" className="flex items-center space-x-3 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === lastIndex

          return (
            <li key={crumb.key} className="flex items-center space-x-3">
              {index > 0 && (
                <ChevronRight
                  className="size-4 shrink-0 text-stone-400"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span className="text-stone-900 font-medium">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-stone-700 transition hover:text-stone-950"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
