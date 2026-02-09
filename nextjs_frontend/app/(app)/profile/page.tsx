"use client"

import { useSession } from "@/lib/auth-client"
import { RiUser3Line, RiMailLine, RiBuildingLine } from "@remixicon/react"

export default function ProfilePage() {
  const { data } = useSession()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-[var(--foreground)]">Paramètres du profil</h1>
        <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
          Gérez vos informations personnelles et vos préférences
        </p>
      </div>

      <div className="rounded-[var(--radius-card)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)] border border-[var(--border-subtle)]">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-[var(--primary)] shadow-[var(--shadow-sm)]">
              <RiUser3Line className="size-7 text-[var(--primary-foreground)]" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-[var(--foreground)]">
                {data?.user?.name ?? "Utilisateur"}
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Utilisateur
              </p>
            </div>
          </div>

          <div className="grid gap-4 border-t border-[var(--border-subtle)] pt-6">
            <div className="flex items-center gap-3">
              <RiMailLine className="size-5 text-[var(--muted-foreground)]" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Email</p>
                <p className="text-sm text-[var(--muted-foreground)]">{data?.user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <RiBuildingLine className="size-5 text-[var(--muted-foreground)]" />
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">ID Utilisateur</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {data?.user?.id ?? "Non spécifié"}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-6">
            <p className="text-sm text-[var(--muted-foreground)]">
              Les fonctionnalités de modification du profil seront bientôt disponibles.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
