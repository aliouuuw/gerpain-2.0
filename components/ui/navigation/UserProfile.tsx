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
          className="flex w-full items-center gap-2.5 rounded-lg bg-[var(--secondary)]/50 px-2.5 py-2 hover:bg-[var(--secondary)] transition-colors"
          aria-label="Menu utilisateur"
        >
          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80">
            <RiUser3Line className="size-4 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 overflow-hidden text-left">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">
              {data?.user?.name ?? "Admin User"}
            </p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">
              {data?.user?.email ?? "admin@example.com"}
            </p>
          </div>
          <RiArrowRightSLine className="size-4 text-[var(--muted-foreground)]" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          className="z-50 min-w-[200px] rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-lg p-1"
          sideOffset={6}
          align="start"
        >
          <div className="px-3 py-2 border-b border-[var(--border)]">
            <p className="text-sm font-medium text-[var(--foreground)]">{data?.user?.name ?? "Admin User"}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{data?.user?.email ?? "admin@example.com"}</p>
          </div>

          {/* Theme Switcher */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors cursor-pointer mt-1">
              {getThemeIcon()}
              <span className="flex-1">Thème</span>
              <span className="text-xs text-[var(--muted-foreground)]">{getThemeLabel()}</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent className="z-50 min-w-[130px] rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-lg p-1">
                <DropdownMenu.Item 
                  className={cx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
                    theme === "light" 
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]" 
                      : "text-[var(--foreground)] hover:bg-[var(--secondary)]"
                  )}
                  onClick={() => handleThemeChange("light")}
                >
                  <RiSunLine className="size-4" />
                  <span>Clair</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  className={cx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
                    theme === "dark" 
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]" 
                      : "text-[var(--foreground)] hover:bg-[var(--secondary)]"
                  )}
                  onClick={() => handleThemeChange("dark")}
                >
                  <RiMoonLine className="size-4" />
                  <span>Sombre</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item 
                  className={cx(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors",
                    theme === "system" 
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]" 
                      : "text-[var(--foreground)] hover:bg-[var(--secondary)]"
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
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors cursor-pointer"
            onClick={handleProfileSettings}
          >
            <RiSettings3Line className="size-4" />
            <span>Paramètres</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-[var(--border)] my-1" />

          {/* Logout */}
          <DropdownMenu.Item 
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--error)] hover:bg-[var(--error-subtle)] transition-colors cursor-pointer"
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
