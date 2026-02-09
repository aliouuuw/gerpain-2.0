"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cx } from "@/lib/utils"
import { Button } from "@/components/Button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DateRangePickerProps {
  value?: DateRange
  onValueChange: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateRangePicker({
  value,
  onValueChange,
  placeholder = "Choisir une période",
  className,
  disabled,
}: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={cx(
            "flex h-10 w-full items-center gap-2 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-[var(--shadow-sm)] transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            value?.from ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-[var(--muted-foreground)]" />
          <span className="truncate">
            {value?.from ? (
              value.to ? (
                <>
                  {format(value.from, "dd MMM yyyy", { locale: fr })} –{" "}
                  {format(value.to, "dd MMM yyyy", { locale: fr })}
                </>
              ) : (
                format(value.from, "dd MMM yyyy", { locale: fr })
              )
            ) : (
              placeholder
            )}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={value?.from}
          selected={value}
          onSelect={onValueChange}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
