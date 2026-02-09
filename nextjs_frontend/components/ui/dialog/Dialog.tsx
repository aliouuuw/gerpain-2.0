import * as DialogPrimitives from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import * as React from "react"

import { cx, focusRing } from "@/lib/utils"

import { Button } from "../../Button"

const Dialog = DialogPrimitives.Root
Dialog.displayName = "Dialog"

const DialogTrigger = DialogPrimitives.Trigger
DialogTrigger.displayName = "DialogTrigger"

const DialogPortal = DialogPrimitives.Portal
DialogPortal.displayName = "DialogPortal"

const DialogClose = DialogPrimitives.Close
DialogClose.displayName = "DialogClose"

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitives.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitives.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitives.Overlay
    ref={ref}
    className={cx(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitives.Content> {
  showCloseButton?: boolean
}

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitives.Content>,
  DialogContentProps
>(({ className, children, showCloseButton = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitives.Content
      ref={ref}
      className={cx(
        "fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
        "rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-lg",
        "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        focusRing,
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitives.Close asChild>
          <Button
            variant="ghost"
            className="absolute right-4 top-4 size-8 p-0"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </Button>
        </DialogPrimitives.Close>
      )}
    </DialogPrimitives.Content>
  </DialogPortal>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cx("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cx(
      "flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitives.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitives.Title
    ref={ref}
    className={cx(
      "text-lg font-semibold leading-none tracking-tight text-[var(--foreground)]",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitives.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitives.Description
    ref={ref}
    className={cx("text-sm text-[var(--muted-foreground)]", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
