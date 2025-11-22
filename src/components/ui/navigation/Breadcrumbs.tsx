import { ChevronRight } from "lucide-react"
import Link from "next/link"

export function Breadcrumbs() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="ml-2">
        <ol role="list" className="flex items-center space-x-3 text-sm">
          <li className="flex">
            <Link
              href="/dashboard"
              className="text-stone-700 transition hover:text-stone-950"
            >
              Accueil
            </Link>
          </li>
          <ChevronRight
            className="size-4 shrink-0 text-stone-500"
            aria-hidden="true"
          />
          <li className="flex">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="text-stone-900 font-medium"
              >
                Tableau de bord
              </Link>
            </div>
          </li>
        </ol>
      </nav>
    </>
  )
}
