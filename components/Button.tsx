import React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Loader2 } from "lucide-react"
import { tv, type VariantProps } from "tailwind-variants"

import { cx, focusRing } from "@/lib/utils"

const buttonVariants = tv({
  base: [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] border text-center text-sm font-semibold tracking-[-0.01em]",
    "transition-[transform,background-color,border-color,color,box-shadow] duration-200",
    "disabled:pointer-events-none disabled:opacity-50",
    focusRing,
  ],
  variants: {
    variant: {
      primary: [
        "border-[var(--border)]",
        "text-[var(--primary-foreground)]",
        "bg-[linear-gradient(135deg,var(--primary),var(--primary-2))]",
        "shadow-[var(--shadow-hero)]",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-xl)]",
        "active:translate-y-0 active:scale-[0.99]",
      ],
      secondary: [
        "border-[var(--border)]",
        "text-[var(--foreground)]",
        "bg-[var(--surface)]",
        "shadow-[var(--shadow-sm)]",
        "hover:-translate-y-0.5 hover:bg-[var(--card)] hover:shadow-[var(--shadow-md)]",
        "active:translate-y-0 active:scale-[0.99]",
      ],
      soft: [
        "border-[var(--border)]",
        "text-[var(--primary)]",
        "bg-[var(--primary-subtle)]",
        "shadow-[var(--shadow-sm)]",
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
        "active:translate-y-0 active:scale-[0.99]",
      ],
      ghost: [
        "border-transparent",
        "text-[var(--foreground)]",
        "bg-transparent",
        "hover:bg-[var(--surface-2)] hover:-translate-y-0.5",
        "active:translate-y-0 active:scale-[0.99]",
      ],
      destructive: [
        "border-[var(--border)]",
        "text-[var(--primary-foreground)]",
        "bg-[var(--error)]",
        "shadow-[var(--shadow-md)]",
        "hover:-translate-y-0.5 hover:bg-[#ff4a4a]",
        "active:translate-y-0 active:scale-[0.99]",
      ],
      outline: [
        "border-[var(--border)]",
        "text-[var(--foreground)]",
        "bg-transparent",
        "shadow-[var(--shadow-sm)]",
        "hover:-translate-y-0.5 hover:bg-[var(--surface-2)] hover:shadow-[var(--shadow-md)]",
        "active:translate-y-0 active:scale-[0.99]",
      ],
    },
    size: {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-sm",
      lg: "h-10 px-5 text-sm",
      xl: "h-11 px-6 text-base",
      icon: "h-9 w-9 p-0",
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
