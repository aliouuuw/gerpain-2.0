// Tremor Input [v1.0.5]

import React from "react"
import { RiEyeFill, RiEyeOffFill, RiSearchLine } from "@remixicon/react"
import { tv, type VariantProps } from "tailwind-variants"

import { cx, focusInput, focusRing, hasErrorInput } from "@/lib/utils"

const inputStyles = tv({
  base: [
    // base
    "relative block w-full appearance-none rounded-[var(--radius-control)] border px-3 py-2.5 outline-none transition-all duration-200 sm:text-sm",
    // border color
    "border-[var(--border-subtle)]",
    // text color
    "text-[var(--foreground)]",
    // placeholder color
    "placeholder-[var(--muted-foreground)]",
    // background color
    "bg-[var(--card)]",
    // disabled
    "disabled:border-[var(--border-subtle)] disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)] disabled:cursor-not-allowed",
    // file
    [
      "file:-my-2.5 file:-ml-3 file:cursor-pointer file:rounded-l-[var(--radius-control)] file:rounded-r-none file:border-0 file:px-3 file:py-2.5 file:outline-none focus:outline-none disabled:pointer-events-none file:disabled:pointer-events-none",
      "file:border-solid file:border-[var(--border)] file:bg-[var(--surface)] file:text-[var(--muted-foreground)] file:hover:bg-[var(--surface-2)]",
      "file:[border-inline-end-width:1px] file:[margin-inline-end:0.75rem]",
      "file:disabled:bg-[var(--muted)] file:disabled:text-[var(--muted-foreground)]",
    ],
    // focus
    focusInput,
    // remove search cancel button
    "[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
  ],
  variants: {
    hasError: {
      true: hasErrorInput,
    },
    // number input
    enableStepper: {
      false:
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
    },
  },
})

interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputStyles> {
  inputClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      inputClassName,
      hasError,
      enableStepper = true,
      type,
      ...props
    }: InputProps,
    forwardedRef,
  ) => {
    const [typeState, setTypeState] = React.useState(type)

    const isPassword = type === "password"
    const isSearch = type === "search"

    return (
      <div className={cx("relative w-full", className)} tremor-id="tremor-raw">
        <input
          ref={forwardedRef}
          type={isPassword ? typeState : type}
          className={cx(
            inputStyles({ hasError, enableStepper }),
            {
              "pl-8": isSearch,
              "pr-10": isPassword,
            },
            inputClassName,
          )}
          {...props}
        />
        {isSearch && (
          <div
            className={cx(
              // base
              "pointer-events-none absolute bottom-0 left-2 flex h-full items-center justify-center",
              // text color
              "text-[var(--muted-foreground)]",
            )}
          >
            <RiSearchLine
              className="size-[1.125rem] shrink-0"
              aria-hidden="true"
            />
          </div>
        )}
        {isPassword && (
          <div
            className={cx(
              "absolute bottom-0 right-0 flex h-full items-center justify-center px-3",
            )}
          >
            <button
              aria-label="Change password visibility"
              className={cx(
                // base
                "h-fit w-fit rounded-sm outline-none transition-all",
                // text
                "text-[var(--muted-foreground)]",
                // hover
                "hover:text-[var(--foreground)]",
                focusRing,
              )}
              type="button"
              onClick={() => {
                setTypeState(typeState === "password" ? "text" : "password")
              }}
            >
              <span className="sr-only">
                {typeState === "password" ? "Afficher le mot de passe" : "Masquer le mot de passe"}
              </span>
              {typeState === "password" ? (
                <RiEyeFill aria-hidden="true" className="size-5 shrink-0" />
              ) : (
                <RiEyeOffFill aria-hidden="true" className="size-5 shrink-0" />
              )}
            </button>
          </div>
        )}
      </div>
    )
  },
)

Input.displayName = "Input"

export { Input, inputStyles, type InputProps }
