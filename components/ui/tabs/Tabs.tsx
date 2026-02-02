"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cx, focusRing } from "@/lib/utils"

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: Array<{
    value: string
    label: string
    icon?: React.ReactNode
    badge?: string | number
    disabled?: boolean
  }>
  className?: string
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

const Tabs = ({ value, onValueChange, tabs, className }: TabsProps) => (
  <TabsPrimitive.Root
    value={value}
    onValueChange={onValueChange}
    className={cx("space-y-4", className)}
  >
    <TabsPrimitive.List
      className={cx(
        "flex w-full items-center gap-2 overflow-x-auto rounded-[var(--radius-card)]",
        "border border-[var(--border)] bg-[var(--card)] p-1",
        "shadow-[var(--shadow-sm)]"
      )}
    >
      {tabs.map((tab) => (
        <TabsPrimitive.Trigger
          key={tab.value}
          value={tab.value}
          disabled={tab.disabled}
          className={cx(
            "flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium",
            "text-[var(--muted-foreground)] transition-all",
            "data-[state=active]:bg-[var(--primary)] data-[state=active]:text-[var(--primary-foreground)]",
            "data-[state=inactive]:hover:text-[var(--foreground)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            focusRing
          )}
        >
          {tab.icon && <span className="text-base">{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px] text-[var(--foreground)]">
              {tab.badge}
            </span>
          )}
        </TabsPrimitive.Trigger>
      ))}
    </TabsPrimitive.List>
  </TabsPrimitive.Root>
)

Tabs.displayName = "Tabs"

const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cx(
      "rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4",
      "shadow-[var(--shadow-sm)]",
      className
    )}
    {...props}
  />
))

TabsContent.displayName = "TabsContent"

export { Tabs, TabsContent, type TabsProps, type TabsContentProps }
