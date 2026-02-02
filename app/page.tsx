import Link from "next/link";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      {/* Navigation */}
      <nav className="border-b border-amber-200/60 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2 shadow-lg shadow-amber-500/20">
                <Logo className="size-6 text-white" />
              </div>
              <div>
                <span className="block text-lg font-bold tracking-tight text-stone-900">
                  Gerpain
                </span>
                <span className="block text-xs font-medium text-amber-700">
                  ERP Boulangerie
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">
                  Connexion
                </Button>
              </Link>
              <Button>
                Demander une démo
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative isolate">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-6xl">
              Solution ERP pour
              <span className="text-amber-600"> Chaînes de Boulangeries</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-stone-600">
              Gérez votre production, vos ventes, votre inventaire et votre équipe
              dans une plateforme unifiée. Conçu spécifiquement pour les besoins
              des boulangeries artisanales et industrielles.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/login">
                <Button className="px-8 py-3 text-base">
                  Commencer maintenant
                </Button>
              </Link>
              <Button variant="secondary" className="px-8 py-3 text-base">
                En savoir plus
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Features Preview */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900">
              Tout ce dont votre boulangerie a besoin
            </h2>
            <p className="mt-4 text-lg text-stone-600">
              Une solution complète pour gérer tous les aspects de votre entreprise
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-lg border border-amber-200/60 bg-amber-50/30">
              <div className="mx-auto h-12 w-12 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-xl">
                📊
              </div>
              <h3 className="mt-4 text-lg font-semibold text-stone-900">Tableau de bord</h3>
              <p className="mt-2 text-sm text-stone-600">Vue d'ensemble de vos performances en temps réel</p>
            </div>

            <div className="text-center p-6 rounded-lg border border-amber-200/60 bg-amber-50/30">
              <div className="mx-auto h-12 w-12 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-xl">
                🛒
              </div>
              <h3 className="mt-4 text-lg font-semibold text-stone-900">Gestion des ventes</h3>
              <p className="mt-2 text-sm text-stone-600">Suivi des livraisons et ventes en boutique</p>
            </div>

            <div className="text-center p-6 rounded-lg border border-amber-200/60 bg-amber-50/30">
              <div className="mx-auto h-12 w-12 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-xl">
                📦
              </div>
              <h3 className="mt-4 text-lg font-semibold text-stone-900">Inventaire</h3>
              <p className="mt-2 text-sm text-stone-600">Gestion des stocks et transferts entre points de vente</p>
            </div>

            <div className="text-center p-6 rounded-lg border border-amber-200/60 bg-amber-50/30">
              <div className="mx-auto h-12 w-12 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-xl">
                👥
              </div>
              <h3 className="mt-4 text-lg font-semibold text-stone-900">Gestion d'équipe</h3>
              <p className="mt-2 text-sm text-stone-600">Pointage, planning et paie simplifiés</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-amber-200/60 bg-stone-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-stone-600">
              © 2024 Gerpain ERP. Solution de gestion pour chaînes de boulangeries.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
