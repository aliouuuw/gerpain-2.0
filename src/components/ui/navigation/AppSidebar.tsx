"use client"
import { Divider } from "@/components/Divider"
import { Input } from "@/components/Input"
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
import { cx, focusRing } from "@/lib/utils"
import { RiArrowDownSFill } from "@remixicon/react"
import { Home, ShoppingCart, Package, Users, Wallet } from "lucide-react"
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
      {
        name: "Vue d'ensemble",
        href: "/sales",
        active: false,
      },
      {
        name: "Saisie des ventes",
        href: "/sales/transactions",
        active: false,
      },
      {
        name: "Livraisons",
        href: "/sales/deliveries",
        active: false,
      },
    ],
  },
  {
    name: "Stock / Inventaire",
    href: "/inventory",
    icon: Package,
    children: [
      {
        name: "Vue d'ensemble",
        href: "/inventory",
        active: false,
      },
      {
        name: "Ajustements",
        href: "/inventory/adjustments",
        active: false,
      },
      {
        name: "Transferts",
        href: "/inventory/transfers",
        active: false,
      },
    ],
  },
  {
    name: "Caisse",
    href: "/cash",
    icon: Wallet,
    children: [
      {
        name: "Vue d'ensemble",
        href: "/cash",
        active: false,
      },
      {
        name: "Collectes",
        href: "/cash/collections",
        active: false,
      },
      {
        name: "Rapprochements",
        href: "/cash/reconciliations",
        active: false,
      },
    ],
  },
  {
    name: "Employés",
    href: "/employees",
    icon: Users,
    children: [
      {
        name: "Vue d'ensemble",
        href: "/employees",
        active: false,
      },
      {
        name: "Liste",
        href: "/employees/list",
        active: false,
      },
      {
        name: "Pointage",
        href: "/employees/attendance",
        active: false,
      },
    ],
  },
] as const

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [openMenus, setOpenMenus] = React.useState<string[]>([
    navigationGroups[0].name,
  ])
  const toggleMenu = (name: string) => {
    setOpenMenus((prev: string[]) =>
      prev.includes(name)
        ? prev.filter((item: string) => item !== name)
        : [...prev, name],
    )
  }
  return (
    <Sidebar {...props}>
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2 shadow-lg shadow-amber-500/20">
            <Logo className="size-6 text-white" />
          </div>
          <div>
            <span className="block text-base font-bold tracking-tight text-stone-900">
              Gerpain
            </span>
            <span className="block text-xs font-medium text-amber-700">
              Gestion boulangerie
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <Input
              type="search"
              placeholder="Rechercher..."
              className="shadow-sm ring-1 ring-amber-200/60 [&>input]:bg-amber-50 [&>input]:border-amber-200 [&>input]:placeholder-stone-500 [&>input]:sm:py-1.5"
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="pt-0">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
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
        <div className="px-3">
          <Divider className="my-0 py-0 border-amber-200/60" />
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-4">
              {navigationGroups.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={cx(
                      "flex w-full items-center justify-between gap-x-2.5 rounded-md p-2 text-sm text-stone-700 transition hover:bg-amber-100/70 hover:text-stone-900",
                      focusRing,
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon
                        className="size-[18px] shrink-0"
                        aria-hidden="true"
                      />
                      {item.name}
                    </div>
                    <RiArrowDownSFill
                      className={cx(
                        "size-5 shrink-0 transform text-stone-400 transition-transform duration-150 ease-in-out",
                        openMenus.includes(item.name)
                          ? "rotate-0"
                          : "-rotate-90",
                      )}
                      aria-hidden="true"
                    />
                  </button>
                  {item.children && openMenus.includes(item.name) && (
                    <SidebarMenuSub>
                      <div className="absolute inset-y-0 left-4 w-px bg-amber-300" />
                      {item.children.map((child) => (
                        <SidebarMenuItem key={child.name}>
                          <SidebarSubLink
                            href={child.href}
                            isActive={child.active}
                          >
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
      <SidebarFooter>
        <div className="border-t border-amber-200/60" />
        <UserProfile />
      </SidebarFooter>
    </Sidebar>
  )
}
