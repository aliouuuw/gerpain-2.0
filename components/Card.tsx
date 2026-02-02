import React from "react"
import { cx } from "@/lib/utils"

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: "default" | "ghost" | "elevated"
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cx(
          "relative rounded-[var(--radius-card)] bg-[var(--card)]",
          "border border-[var(--border-subtle)]",
          "shadow-[var(--shadow-md)]",
          "transition-[transform,background-color,border-color,box-shadow] duration-200",
          variant === "default" && "hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]",
          variant === "ghost" && "border border-transparent bg-transparent shadow-none",
          variant === "elevated" && "hover:-translate-y-1 hover:shadow-[var(--shadow-xl)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = "Card"

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx("flex flex-col space-y-1.5 p-5", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cx(
      "font-display text-base font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--foreground)]",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cx("text-sm text-[var(--muted-foreground)] leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cx("p-5 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx("flex items-center p-5 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"
