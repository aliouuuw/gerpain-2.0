"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { fr } from "date-fns/locale"

import { cx } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cx("p-3", className)}
      locale={fr}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-[var(--foreground)]",
        nav: "flex items-center gap-1",
        button_previous: cx(
          "absolute left-1 inline-flex items-center justify-center size-7 rounded-[var(--radius-control)] border border-[var(--border)] bg-transparent text-[var(--muted-foreground)]",
          "hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
        ),
        button_next: cx(
          "absolute right-1 inline-flex items-center justify-center size-7 rounded-[var(--radius-control)] border border-[var(--border)] bg-transparent text-[var(--muted-foreground)]",
          "hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-[var(--muted-foreground)] rounded-[var(--radius-control)] w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: cx(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "h-9 w-9 inline-flex items-center justify-center rounded-[var(--radius-control)]",
          "hover:bg-[var(--secondary)] cursor-pointer",
          "[&.rdp-selected]:bg-[var(--primary)] [&.rdp-selected]:text-[var(--primary-foreground)]",
        ),
        day_button: cx(
          "inline-flex items-center justify-center size-9 rounded-[var(--radius-control)] text-sm font-normal",
          "aria-selected:opacity-100",
        ),
        range_start: "rounded-l-[var(--radius-control)] bg-[var(--primary)] text-[var(--primary-foreground)]",
        range_end: "rounded-r-[var(--radius-control)] bg-[var(--primary)] text-[var(--primary-foreground)]",
        range_middle: "bg-[var(--secondary)] text-[var(--secondary-foreground)] rounded-none",
        selected: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]",
        today: "bg-[var(--secondary)] text-[var(--foreground)] font-semibold",
        outside: "text-[var(--muted-foreground)] opacity-50",
        disabled: "text-[var(--muted-foreground)] opacity-50 cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
