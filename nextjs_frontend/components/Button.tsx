import React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Loader2 } from "lucide-react"
import { tv, type VariantProps } from "tailwind-variants"

import { cx, focusRing } from "@/lib/utils"

const buttonVariants = tv({
  base: [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] border text-center text-sm font-medium",
    "transition-all duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing,
  ],
  variants: {
    variant: {
      primary: [
        "border-transparent",
        "text-[var(--primary-foreground)]",
        "bg-[var(--primary)]",
        "shadow-[var(--shadow-md)]",
        "hover:bg-[var(--primary-hover)] hover:shadow-[var(--shadow-lg)]",
        "active:scale-[0.98]",
      ],
      secondary: [
        "border-[var(--border)]",
        "text-[var(--foreground)]",
        "bg-[var(--card)]",
        "shadow-[var(--shadow-sm)]",
        "hover:bg-[var(--surface)] hover:border-[var(--border)]",
        "active:scale-[0.98]",
      ],
      soft: [
        "border-transparent",
        "text-[var(--primary)]",
        "bg-[var(--primary-subtle)]",
        "hover:bg-[var(--primary-subtle)]/80",
        "active:scale-[0.98]",
      ],
      ghost: [
        "border-transparent",
        "text-[var(--muted-foreground)]",
        "bg-transparent",
        "hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
        "active:scale-[0.98]",
      ],
      destructive: [
        "border-transparent",
        "text-white",
        "bg-[var(--error)]",
        "shadow-[var(--shadow-sm)]",
        "hover:bg-[var(--error)]/90",
        "active:scale-[0.98]",
      ],
      outline: [
        "border-[var(--border)]",
        "text-[var(--foreground)]",
        "bg-transparent",
        "hover:bg-[var(--surface)] hover:border-[var(--primary)]/30",
        "active:scale-[0.98]",
      ],
    },
    size: {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-10 px-5 text-sm",
      xl: "h-11 px-6 text-base",
      icon: "size-9 p-0",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
})

interface ButtonProps
  extends React.ComponentPropsWithoutRef<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild,
      isLoading = false,
      loadingText,
      className,
      disabled,
      variant,
      size,
      children,
      ...props
    }: ButtonProps,
    forwardedRef,
  ) => {
    const Component = asChild ? Slot : "button"
    return (
      <Component
        ref={forwardedRef}
        className={cx(buttonVariants({ variant, size }), className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="pointer-events-none flex shrink-0 items-center justify-center gap-2">
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            <span className="sr-only">{loadingText ?? "Chargement"}</span>
            {loadingText ?? children}
          </span>
        ) : (
          children
        )}
      </Component>
    )
  },
)

Button.displayName = "Button"

export { Button, buttonVariants, type ButtonProps }
