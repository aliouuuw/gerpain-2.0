import React from "react"

import { cx } from "@/lib/utils"

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  stickyHeader?: boolean
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, stickyHeader, ...props }, ref) => (
    <div className="w-full overflow-x-auto">
      <table
        ref={ref}
        className={cx(
          "min-w-full text-sm",
          stickyHeader && "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10",
          className
        )}
        {...props}
      />
    </div>
  )
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cx("bg-[var(--surface)]", className)}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cx("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cx(
      "border-t border-[var(--border)] bg-[var(--secondary)]/50 font-medium",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  variant?: "default" | "header" | "muted"
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <tr
      ref={ref}
      className={cx(
        "border-b border-[var(--border)]/50 transition-colors",
        variant === "default" && "hover:bg-[var(--secondary)]/50",
        variant === "header" && "border-[var(--border)]",
        variant === "muted" && "bg-[var(--secondary)]/50",
        className
      )}
      {...props}
    />
  )
)
TableRow.displayName = "TableRow"

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, numeric, ...props }, ref) => (
    <th
      ref={ref}
      className={cx(
        "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]",
        numeric && "text-right",
        className
      )}
      {...props}
    />
  )
)
TableHead.displayName = "TableHead"

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, numeric, ...props }, ref) => (
    <td
      ref={ref}
      className={cx(
        "px-4 py-3 align-top text-[var(--foreground)]",
        numeric && "text-right tabular-nums",
        className
      )}
      {...props}
    />
  )
)
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cx(
      "mt-4 text-sm text-[var(--muted-foreground)]",
      className
    )}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

interface TableEmptyStateProps {
  colSpan: number
  icon?: React.ReactNode
  message?: string
  action?: React.ReactNode
}

function TableEmptyState({
  colSpan,
  icon,
  message = "Aucune donnée à afficher",
  action,
}: TableEmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <div className="flex flex-col items-center gap-3">
          {icon && (
            <span className="text-[var(--muted-foreground)]">{icon}</span>
          )}
          <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
          {action}
        </div>
      </td>
    </tr>
  )
}
TableEmptyState.displayName = "TableEmptyState"

interface TableLoadingStateProps {
  colSpan: number
  rows?: number
  message?: string
}

function TableLoadingState({
  colSpan,
  rows = 3,
  message = "Chargement…",
}: TableLoadingStateProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="border-b border-[var(--border)]/50">
          <td colSpan={colSpan} className="px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="h-4 w-full animate-pulse rounded bg-[var(--secondary)]" />
            </div>
          </td>
        </tr>
      ))}
      <tr>
        <td colSpan={colSpan} className="px-4 py-2 text-center">
          <p className="text-xs text-[var(--muted-foreground)]">{message}</p>
        </td>
      </tr>
    </>
  )
}
TableLoadingState.displayName = "TableLoadingState"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableEmptyState,
  TableLoadingState,
}
