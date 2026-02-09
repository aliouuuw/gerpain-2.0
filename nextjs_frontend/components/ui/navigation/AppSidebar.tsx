"use client"
import { Divider } from "@/components/Divider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarLink,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarSubLink,
} from "@/components/Sidebar"
import { BakerySelector } from "@/components/ui/BakerySelector"
import { cx, focusRing } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import { Home, ShoppingCart, Package, Users, Wallet, FileText, Search, Settings, Building2, MapPin, User } from "lucide-react"
import * as React from "react"
import { Logo } from "@/components/Logo"
import { UserProfile } from "./UserProfile"

const navigation = [
  {
    name: "Tableau de bord",
    href: "/dashboard",
    icon: Home,
    notifications: false,
    active: false,
  },
] as const

const navigationGroups = [
  {
    name: "Ventes",
    href: "/sales",
    icon: ShoppingCart,
    children: [
      { name: "Vue d'ensemble", href: "/sales", active: false },
      { name: "Livraisons", href: "/sales/deliveries", active: false },
      { name: "Vente boutique", href: "/sales/transactions", active: false },
      { name: "Produits", href: "/sales/products", active: false },
    ],
  },
  {
    name: "Collectes",
    href: "/cash",
    icon: Wallet,
    children: [
      { name: "Vue d'ensemble", href: "/cash", active: false },
      { name: "Encaissements", href: "/cash/collections", active: false },
      { name: "Historique", href: "/cash/reconciliations", active: false },
    ],
  },
  {
    name: "Stock",
    href: "/inventory",
    icon: Package,
    children: [
      { name: "Vue d'ensemble", href: "/inventory", active: false },
      { name: "Niveaux", href: "/inventory/stock", active: false },
      { name: "Catégories", href: "/inventory/categories", active: false },
      { name: "Tarifs", href: "/inventory/pricing", active: false },
      { name: "Ajustements", href: "/inventory/adjustments", active: false },
      { name: "Transferts", href: "/inventory/transfers", active: false },
    ],
  },
  {
    name: "Employés",
    href: "/employees",
    icon: Users,
    children: [
      { name: "Vue d'ensemble", href: "/employees", active: false },
      { name: "Liste", href: "/employees/list", active: false },
      { name: "Pointage", href: "/employees/attendance", active: false },
    ],
  },
  {
    name: "Paie",
    href: "/payroll",
    icon: FileText,
    children: [
      { name: "Vue d'ensemble", href: "/payroll", active: false },
      { name: "Congés & absences", href: "/payroll/leaves", active: false },
      { name: "Avances & prêts", href: "/payroll/loans", active: false },
      { name: "Primes & bonus", href: "/payroll/bonuses", active: false },
      { name: "Bulletins de paie", href: "/payroll/payslips", active: false },
    ],
  },
  {
    name: "Paramètres",
    href: "/settings",
    icon: Settings,
    children: [
      { name: "Organisation", href: "/settings/organization", active: false },
      { name: "Boulangeries", href: "/settings/bakeries", active: false },
      { name: "Localisations", href: "/settings/locations", active: false },
      { name: "Mon profil", href: "/profile", active: false },
    ],
  },
] as const

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [openMenus, setOpenMenus] = React.useState<string[]>([navigationGroups[0].name])
  
  const toggleMenu = (name: string) => {
    setOpenMenus((prev: string[]) =>
      prev.includes(name)
        ? prev.filter((item: string) => item !== name)
        : [...prev, name],
    )
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-orange-600">
            <Logo className="size-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
              Gerpain
            </span>
            <span className="text-[10px] font-medium text-[var(--muted-foreground)]">
              Gestion boulangerie
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Bakery Selector */}
        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <BakerySelector />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Search */}
        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <button className={cx(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm",
              "bg-[var(--secondary)]/50 text-[var(--muted-foreground)]",
              "border border-[var(--border)]/50",
              "hover:bg-[var(--secondary)] hover:text-[var(--foreground)]",
              "transition-all duration-200",
              focusRing
            )}>
              <Search className="size-4" />
              <span>Rechercher...</span>
              <kbd className="ml-auto hidden rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] sm:inline-block">
                ⌘K
              </kbd>
            </button>
          </SidebarGroupContent>
        </SidebarGroup>

        <Divider className="my-1.5 border-[var(--border)]/60" />

        {/* Main Navigation */}
        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarLink
                    href={item.href}
                    isActive={item.active}
                    icon={item.icon}
                    notifications={item.notifications}
                  >
                    {item.name}
                  </SidebarLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Divider className="my-1.5 border-[var(--border)]/60" />

        {/* Navigation Groups */}
        <SidebarGroup className="p-1">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navigationGroups.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={cx(
                      "flex w-full items-center justify-between gap-x-2 rounded-lg px-2.5 py-1.5 text-sm transition-all duration-200",
                      "text-[var(--foreground)] hover:bg-[var(--secondary)]",
                      openMenus.includes(item.name) && "bg-[var(--secondary)]/50",
                      focusRing,
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="size-4 shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <ChevronRight
                      className={cx(
                        "size-3.5 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200",
                        openMenus.includes(item.name) && "rotate-90",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {item.children && openMenus.includes(item.name) && (
                    <SidebarMenuSub className="mt-0.5 ml-[22px] border-l border-[var(--border)]/60 pl-2.5">
                      {item.children.map((child) => (
                        <SidebarMenuItem key={child.name}>
                          <SidebarSubLink href={child.href} isActive={child.active}>
                            {child.name}
                          </SidebarSubLink>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Divider className="mb-2 border-[var(--border)]/60" />
        <UserProfile />
      </SidebarFooter>
    </Sidebar>
  )
}
