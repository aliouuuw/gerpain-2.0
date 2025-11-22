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
import { Home, ShoppingCart, Package, Users, BarChart3, Settings } from "lucide-react"
import * as React from "react"
import { Logo } from "@/components/Logo"
import { UserProfile } from "./UserProfile"

const navigation = [
  {
    name: "Accueil",
    href: "/dashboard",
    icon: Home,
    notifications: false,
    active: true,
  },
  {
    name: "Commandes",
    href: "/orders",
    icon: ShoppingCart,
    notifications: 3,
    active: false,
  },
] as const

const navigation2 = [
  {
    name: "Production",
    href: "#",
    icon: Package,
    children: [
      {
        name: "Planning",
        href: "/production/planning",
        active: false,
      },
      {
        name: "Recettes",
        href: "/production/recipes",
        active: false,
      },
      {
        name: "Stock matières",
        href: "/production/stock",
        active: false,
      },
    ],
  },
  {
    name: "Ventes",
    href: "#",
    icon: BarChart3,
    children: [
      {
        name: "Points de vente",
        href: "/sales/locations",
        active: false,
      },
      {
        name: "Rapports",
        href: "/sales/reports",
        active: false,
      },
      {
        name: "Clients",
        href: "/sales/customers",
        active: false,
      },
    ],
  },
  {
    name: "Équipe",
    href: "#",
    icon: Users,
    children: [
      {
        name: "Personnel",
        href: "/team/staff",
        active: false,
      },
      {
        name: "Horaires",
        href: "/team/schedules",
        active: false,
      },
      {
        name: "Paie",
        href: "/team/payroll",
        active: false,
      },
    ],
  },
] as const

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [openMenus, setOpenMenus] = React.useState<string[]>([
    navigation2[0].name,
    navigation2[1].name,
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
              {navigation2.map((item) => (
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
                        openMenus.includes(item.name)
                          ? "rotate-0"
                          : "-rotate-90",
                        "size-5 shrink-0 transform text-stone-400 transition-transform duration-150 ease-in-out dark:text-stone-600",
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
