"use client"

import { signOut, useSession } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { 
  RiLogoutBoxRLine, 
  RiUser3Line, 
  RiSettings3Line, 
  RiMoonLine, 
  RiSunLine,
  RiComputerLine,
  RiArrowRightSLine
} from "@remixicon/react"
import { cx } from "@/lib/utils"
import { useTheme } from "next-themes"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"

export function UserProfile() {
  const router = useRouter()
  const { data } = useSession()
  const { theme, setTheme } = useTheme()

  const handleLogout = async () => {
    await signOut()
    router.replace("/login")
  }

  const handleProfileSettings = () => {
    router.push("/profile")
  }

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme)
  }

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <RiSunLine className="size-4" />
      case "dark":
        return <RiMoonLine className="size-4" />
      default:
        return <RiComputerLine className="size-4" />
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Clair"
      case "dark":
        return "Sombre"
      default:
        return "Système"
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button 
          className="flex items-center gap-3 rounded-lg bg-[var(--card)]/60 px-3 py-2.5 shadow-sm ring-1 ring-[var(--ring)]/50 hover:bg-[var(--card)]/80 transition-colors"
          aria-label="Menu utilisateur"
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 shadow-sm">
            <RiUser3Line className="size-5 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 overflow-hidden text-left">
            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
              {data?.user?.name ?? "Utilisateur"}
            </p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              {data?.user?.email}
            </p>
          </div>
          <RiArrowRightSLine className="size-5 text-[var(--muted-foreground)]" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          className="z-50 min-w-[220px] rounded-lg bg-[var(--card)]/95 backdrop-blur-sm shadow-lg ring-1 ring-[var(--ring)]/50 p-1"
          sideOffset={5}
          align="end"
        >
          <DropdownMenu.Item className="px-3 py-2 text-sm text-[var(--muted-foreground)] font-medium">
            {data?.user?.name ?? "Utilisateur"}
          </DropdownMenu.Item>
          
          <DropdownMenu.Separator className="h-px bg-[var(--border)] my-1" />

          {/* Theme Switcher */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors cursor-pointer">
              {getThemeIcon()}
              <span>Thème</span>
              <span className="ml-auto text-xs text-[var(--muted-foreground)]">{getThemeLabel()}</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent className="z-50 min-w-[140px] rounded-lg bg-[var(--card)]/95 backdrop-blur-sm shadow-lg ring-1 ring-[var(--ring)]/50 p-1">
                <DropdownMenu.Item 
                  className={cx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
                    theme === "light" 
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]" 
                      : "text-[var(--foreground)] hover:bg-[var(--accent)]"
                  )}
                  onClick={() => handleThemeChange("light")}
                >
                  <RiSunLine className="size-4" />
                  <span>Clair</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  className={cx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
                    theme === "dark" 
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]" 
                      : "text-[var(--foreground)] hover:bg-[var(--accent)]"
                  )}
                  onClick={() => handleThemeChange("dark")}
                >
                  <RiMoonLine className="size-4" />
                  <span>Sombre</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  className={cx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer transition-colors",
                    theme === "system" 
                      ? "bg-[var(--accent)] text-[var(--accent-foreground)]" 
                      : "text-[var(--foreground)] hover:bg-[var(--accent)]"
                  )}
                  onClick={() => handleThemeChange("system")}
                >
                  <RiComputerLine className="size-4" />
                  <span>Système</span>
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          {/* Profile Settings */}
          <DropdownMenu.Item 
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors cursor-pointer"
            onClick={handleProfileSettings}
          >
            <RiSettings3Line className="size-4" />
            <span>Paramètres du profil</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-[var(--border)] my-1" />

          {/* Logout */}
          <DropdownMenu.Item 
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            onClick={handleLogout}
          >
            <RiLogoutBoxRLine className="size-4" />
            <span>Déconnexion</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
