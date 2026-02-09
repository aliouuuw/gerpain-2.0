// Tremor Divider [v0.0.1]

import React from "react"

import { cx } from "@/lib/utils"

const Divider = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>(({ className, ...props }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      className={cx(
        // base
        "w-full border-t py-2",
        // border color
        "border-[var(--border)]",
        className,
      )}
      tremor-id="tremor-raw"
      {...props}
    />
  )
})

Divider.displayName = "Divider"

export { Divider }
