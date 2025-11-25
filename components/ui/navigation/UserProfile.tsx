"use client"

import { signOut, useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { RiLogoutBoxRLine, RiUser3Line } from "@remixicon/react"
import { cx } from "@/lib/utils"

export function UserProfile() {
  const router = useRouter()
  const { data } = useSession()

  const handleLogout = async () => {
    await signOut()
    router.replace("/login")
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/60 px-3 py-2.5 shadow-sm ring-1 ring-amber-200/50">
      <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
        <RiUser3Line className="size-5 text-white" aria-hidden="true" />
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm font-semibold text-stone-900">
          {data?.user?.name ?? "Utilisateur"}
        </p>
        <p className="truncate text-xs text-stone-600">
          {data?.user?.email}
        </p>
      </div>
      <button
        onClick={handleLogout}
        className={cx(
          "rounded-md p-1.5 text-stone-600 transition hover:bg-amber-100 hover:text-amber-900"
        )}
        aria-label="Déconnexion"
      >
        <RiLogoutBoxRLine className="size-5" aria-hidden="true" />
      </button>
    </div>
  )
}
