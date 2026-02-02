"use client"

import * as React from "react"
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from "@headlessui/react"
import { Check, ChevronDown, X } from "lucide-react"

import { cx, focusRing } from "@/lib/utils"

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
  icon?: React.ReactNode
}

interface SelectProps {
  value?: string | string[]
  onValueChange: (value: string | string[]) => void
  placeholder?: string
  options: SelectOption[]
  multi?: boolean
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
  error?: string
  className?: string
}

const normalizeValue = (value: string | string[] | undefined, multi?: boolean) => {
  if (multi) {
    return Array.isArray(value) ? value : []
  }
  return typeof value === "string" ? value : ""
}

const matchOption = (options: SelectOption[], value: string) =>
  options.find((option) => option.value === value)

const formatValue = (options: SelectOption[], value: string | string[]) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => matchOption(options, entry)?.label)
      .filter(Boolean)
      .join(", ")
  }

  return matchOption(options, value)?.label ?? ""
}

const filterOptions = (options: SelectOption[], query: string) => {
  if (!query) return options
  const normalizedQuery = query.toLowerCase()
  return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
}

export function Select({
  value,
  onValueChange,
  placeholder = "Sélectionner",
  options,
  multi,
  searchable,
  clearable,
  disabled,
  error,
  className,
}: SelectProps) {
  const [query, setQuery] = React.useState("")
  const currentValue = normalizeValue(value, multi)
  const displayValue = formatValue(options, currentValue)
  const filteredOptions = filterOptions(options, query)

  const handleChange = (newValue: string | string[] | null) => {
    const nextValue = newValue ?? (multi ? [] : "")
    onValueChange(nextValue)
    setQuery("")
  }

  const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onValueChange(multi ? [] : "")
  }

  return (
    <div className={cx("space-y-1.5", className)}>
      <Combobox
        value={currentValue}
        onChange={handleChange}
        multiple={multi}
        disabled={disabled}
      >
        <div className="relative">
          <div
            className={cx(
              "flex min-h-[2.5rem] w-full items-center gap-2 rounded-[var(--radius-control)]",
              "border border-[var(--border)] bg-[var(--card)] px-3 py-2",
              "text-sm text-[var(--foreground)] shadow-[var(--shadow-sm)]",
              "transition-all",
              disabled && "cursor-not-allowed opacity-60",
              error && "border-[var(--error)]",
              focusRing
            )}
          >
            {searchable ? (
              <ComboboxInput
                className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none"
                displayValue={() => displayValue}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
              />
            ) : (
              <ComboboxButton className="flex w-full items-center gap-2">
                <span className={cx("flex-1 truncate text-left", !displayValue && "text-[var(--muted-foreground)]")}>
                  {displayValue || placeholder}
                </span>
              </ComboboxButton>
            )}

            {clearable && !!displayValue && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex size-6 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
                aria-label="Effacer la sélection"
              >
                <X className="size-3.5" />
              </button>
            )}

            <ComboboxButton className="ml-auto inline-flex size-6 items-center justify-center text-[var(--muted-foreground)]">
              <ChevronDown className="size-4" />
            </ComboboxButton>
          </div>

          <ComboboxOptions
            className={cx(
              "absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-[var(--radius-card)]",
              "border border-[var(--border)] bg-[var(--card)] p-1 shadow-[var(--shadow-lg)]",
              "focus:outline-none"
            )}
          >
            {filteredOptions.length === 0 && (
              <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">
                Aucun résultat
              </div>
            )}
            {filteredOptions.map((option) => (
              <ComboboxOption
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={({ active, disabled: optionDisabled }) =>
                  cx(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm",
                    active && "bg-[var(--secondary)]",
                    optionDisabled && "cursor-not-allowed opacity-50"
                  )
                }
              >
                {({ selected }) => (
                  <>
                    {option.icon && (
                      <span className="text-[var(--muted-foreground)]">{option.icon}</span>
                    )}
                    <span className="flex-1 truncate text-[var(--foreground)]">{option.label}</span>
                    {selected && <Check className="size-4 text-[var(--primary)]" />}
                  </>
                )}
              </ComboboxOption>
            ))}
          </ComboboxOptions>
        </div>
      </Combobox>

      {error && <p className="text-xs text-[var(--error)]">{error}</p>}
    </div>
  )
}

export type { SelectProps, SelectOption }
