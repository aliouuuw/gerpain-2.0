import React from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cx } from "@/lib/utils"

const badgeVariants = tv({
  base: [
    "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
    "transition-colors",
  ],
  variants: {
    variant: {
      default: "border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)]",
      success: "border-transparent bg-[var(--success-subtle)] text-[var(--success)]",
      warning: "border-transparent bg-[var(--warning-subtle)] text-[var(--warning)]",
      error: "border-transparent bg-[var(--error-subtle)] text-[var(--error)]",
      info: "border-transparent bg-[var(--info-subtle)] text-[var(--info)]",
    },
    size: {
      sm: "text-[10px] px-2 py-0.5",
      md: "text-xs px-2.5 py-0.5",
      lg: "text-sm px-3 py-1",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
})

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cx(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
)
Badge.displayName = "Badge"

export { Badge, type BadgeProps }
