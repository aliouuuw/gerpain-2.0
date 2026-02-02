"use client"

import { useSession } from "@/lib/auth-client"
import { RiUser3Line, RiMailLine, RiBuildingLine } from "@remixicon/react"

export default function ProfilePage() {
  const { data } = useSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Paramètres du profil</h1>
        <p className="mt-2 text-sm text-stone-600">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-amber-200/50">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
              <RiUser3Line className="size-8 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-stone-900">
                {data?.user?.name ?? "Utilisateur"}
              </h2>
              <p className="text-sm text-stone-600">
                Utilisateur
              </p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-stone-200 pt-6">
            <div className="flex items-center gap-3">
              <RiMailLine className="size-5 text-stone-400" />
              <div>
                <p className="text-sm font-medium text-stone-900">Email</p>
                <p className="text-sm text-stone-600">{data?.user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <RiBuildingLine className="size-5 text-stone-400" />
              <div>
                <p className="text-sm font-medium text-stone-900">ID Utilisateur</p>
                <p className="text-sm text-stone-600">
                  {data?.user?.id ?? "Non spécifié"}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-6">
            <p className="text-sm text-stone-500">
              Les fonctionnalités de modification du profil seront bientôt disponibles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
