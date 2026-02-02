"use client"

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/Drawer"
import { useIsMobile } from "@/lib/useMobile"
import { cx, focusRing } from "@/lib/utils"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"
import { RiCloseLine } from "@remixicon/react"
import { PanelLeft } from "lucide-react"
import * as React from "react"
import Link, { type LinkProps } from "next/link"
import { Button } from "./Button"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"

type SidebarContext = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)

    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open
    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }

        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      },
      [setOpenProp, open],
    )

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isMobile, setOpen, setOpenMobile])

    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      ],
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <div
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              ...style,
            } as React.CSSProperties
          }
          className={cx("flex min-h-svh w-full", className)}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    )
  },
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, children, ...props }, ref) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar()
    const isExpanded = state === "expanded"

    if (isMobile) {
      return (
        <Drawer open={openMobile} onOpenChange={setOpenMobile} {...props}>
          <DrawerContent className="bg-[var(--card)] p-0 text-[var(--foreground)]">
            <VisuallyHidden.Root>
              <DrawerTitle>Menu</DrawerTitle>
            </VisuallyHidden.Root>
            <div className="relative flex h-full w-full flex-col">
              <DrawerClose className="absolute right-4 top-4 z-10" asChild>
                <Button
                  variant="ghost"
                  className="!p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  <RiCloseLine className="size-5 shrink-0" aria-hidden="true" />
                </Button>
              </DrawerClose>
              {children}
            </div>
          </DrawerContent>
        </Drawer>
      )
    }

    // Desktop: sidebar wrapper takes up space in flex layout, pushing main content
    return (
      <div
        ref={ref}
        className="hidden shrink-0 md:block"
        style={{
          width: isExpanded ? SIDEBAR_WIDTH : 0,
          transition: "width 200ms ease-out",
        }}
        data-state={state}
      >
        {/* Fixed sidebar that stays in place */}
        <div
          className={cx(
            "fixed inset-y-0 left-0 z-20 h-svh border-r border-[var(--border-subtle)] bg-[var(--card)] text-[var(--foreground)]",
            "transition-transform duration-200 ease-out",
            !isExpanded && "-translate-x-full",
            className,
          )}
          style={{ width: SIDEBAR_WIDTH }}
          {...props}
        >
          <div
            data-sidebar="sidebar"
            className="flex h-full w-full flex-col"
          >
            {children}
          </div>
        </div>
      </div>
    )
  },
)
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  React.ComponentRef<"button">,
  React.ComponentPropsWithRef<"button">
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      ref={ref}
      data-sidebar="trigger"
      className={cx(
        "group inline-flex rounded-md p-1.5 text-[var(--muted-foreground)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
        focusRing,
      )}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft className="size-[18px] shrink-0" aria-hidden="true" />
      <span className="sr-only">Basculer le menu</span>
    </button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="footer"
      className={cx("flex flex-col", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cx(
        "flex min-h-0 flex-1 flex-col overflow-auto",
        className,
      )}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cx("flex flex-col", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

type SidebarLinkProps = LinkProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    children: React.ReactNode
    icon?: React.ElementType
    isActive?: boolean
    notifications?: number | boolean
  }

const SidebarLink = React.forwardRef<HTMLAnchorElement, SidebarLinkProps>(
  ({ children, isActive, icon, notifications, className, ...props }, ref) => {
    const Icon = icon
    return (
      <Link
        ref={ref}
        aria-current={isActive ? "page" : undefined}
        data-active={isActive}
        className={cx(
          "flex items-center justify-between rounded-[var(--radius-control)] px-2.5 py-1.5 text-sm",
          "text-[var(--foreground)]",
          "transition-[background-color,color,transform] duration-200",
          "hover:-translate-y-0.5 hover:bg-[var(--surface-2)]",
          "data-[active=true]:bg-[var(--primary-subtle)] data-[active=true]:text-[var(--foreground)] data-[active=true]:font-semibold",
          focusRing,
          className,
        )}
        {...props}
      >
        <span className="flex items-center gap-x-2">
          {Icon && (
            <Icon className="size-4 shrink-0 text-[var(--muted-foreground)] data-[active=true]:text-[var(--primary)]" aria-hidden="true" />
          )}
          <span className="font-medium">{children}</span>
        </span>
        {notifications && (
          <span className="inline-flex size-4 items-center justify-center rounded-full bg-[var(--primary)] text-[9px] font-semibold text-[var(--primary-foreground)]">
            {notifications}
          </span>
        )}
      </Link>
    )
  },
)
SidebarLink.displayName = "SidebarLink"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cx("relative flex w-full min-w-0 flex-col", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cx("w-full text-sm", className)}
    {...props}
  />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cx("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuItem.displayName = "SidebarMenuItem"

type SidebarSubLinkProps = LinkProps & {
  href: string;
} & React.ComponentProps<"a"> & {
  children: React.ReactNode
  isActive?: boolean
}

const SidebarSubLink = React.forwardRef<HTMLAnchorElement, SidebarSubLinkProps>(
  ({ isActive, children, className, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        aria-current={isActive ? "page" : undefined}
        data-active={isActive}
        className={cx(
          "relative flex gap-2 rounded-[calc(var(--radius-control)-0.25rem)] py-1 px-2 text-[13px]",
          "text-[var(--muted-foreground)]",
          "transition-[background-color,color,transform] duration-200",
          "hover:-translate-y-0.5 hover:text-[var(--foreground)] hover:bg-[var(--surface-2)]",
          "data-[active=true]:bg-[var(--primary-subtle)] data-[active=true]:text-[var(--foreground)] data-[active=true]:font-semibold",
          focusRing,
          className,
        )}
        {...props}
      >
        {children}
      </Link>
    )
  },
)
SidebarSubLink.displayName = "SidebarSubLink"

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cx("relative space-y-1 border-l border-transparent", className)}
    {...props}
  />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  return (
    <main
      ref={ref}
      className={cx(
        "relative flex min-h-svh flex-1 flex-col bg-[var(--background)] transition-[margin] duration-150 ease-in-out peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
        className,
      )}
      {...props}
    />
  )
})
SidebarInset.displayName = "SidebarInset"

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarLink,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarProvider,
  SidebarSubLink,
  SidebarTrigger,
  useSidebar,
}
