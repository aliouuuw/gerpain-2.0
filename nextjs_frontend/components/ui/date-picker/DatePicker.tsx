"use client"

import * as React from "react"
import { Calendar, X } from "lucide-react"

import { cx, focusRing } from "@/lib/utils"

interface DateRange {
  from: Date
  to?: Date
}

interface DatePickerProps {
  value?: Date | DateRange
  onValueChange: (value: Date | DateRange | undefined) => void
  placeholder?: string
  mode?: "single" | "range"
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  error?: string
  className?: string
}

const formatDateInput = (date?: Date) => {
  if (!date) return ""
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const parseDateInput = (value: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

export function DatePicker({
  value,
  onValueChange,
  placeholder = "Choisir une date",
  mode = "single",
  disabled,
  minDate,
  maxDate,
  error,
  className,
}: DatePickerProps) {
  const isRange = mode === "range"
  const rangeValue = value && typeof value === "object" && "from" in value ? value : undefined
  const singleValue = value instanceof Date ? value : undefined

  const handleSingleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const date = parseDateInput(event.target.value)
    onValueChange(date)
  }

  const handleRangeChange = (key: "from" | "to") => (event: React.ChangeEvent<HTMLInputElement>) => {
    const date = parseDateInput(event.target.value)
    const nextRange: DateRange = {
      from: rangeValue?.from ?? new Date(),
      to: rangeValue?.to,
    }

    if (key === "from") {
      nextRange.from = date ?? rangeValue?.from ?? new Date()
    } else {
      nextRange.to = date
    }

    onValueChange(date ? nextRange : rangeValue?.from ? { ...nextRange, to: undefined } : undefined)
  }

  const clearValue = () => onValueChange(undefined)

  return (
    <div className={cx("space-y-1.5", className)}>
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
        <Calendar className="size-4 text-[var(--muted-foreground)]" />
        {isRange ? (
          <div className="flex w-full items-center gap-2">
            <input
              type="date"
              value={formatDateInput(rangeValue?.from)}
              onChange={handleRangeChange("from")}
              disabled={disabled}
              min={formatDateInput(minDate)}
              max={formatDateInput(maxDate)}
              className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none"
              placeholder={placeholder}
            />
            <span className="text-xs text-[var(--muted-foreground)]">→</span>
            <input
              type="date"
              value={formatDateInput(rangeValue?.to)}
              onChange={handleRangeChange("to")}
              disabled={disabled}
              min={formatDateInput(minDate)}
              max={formatDateInput(maxDate)}
              className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none"
              placeholder={placeholder}
            />
          </div>
        ) : (
          <input
            type="date"
            value={formatDateInput(singleValue)}
            onChange={handleSingleChange}
            disabled={disabled}
            min={formatDateInput(minDate)}
            max={formatDateInput(maxDate)}
            className="w-full bg-transparent text-sm text-[var(--foreground)] outline-none"
            placeholder={placeholder}
          />
        )}
        {value && !disabled && (
          <button
            type="button"
            onClick={clearValue}
            className="inline-flex size-6 items-center justify-center rounded-full text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
            aria-label="Effacer la date"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-[var(--error)]">{error}</p>}
    </div>
  )
}

export type { DatePickerProps, DateRange }
