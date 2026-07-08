import type {
  PayrollLinePreview,
  PayrollPreview,
} from '#/services/payroll'

export function totalsFromPayrollLines(
  lines: PayrollLinePreview[],
): PayrollPreview['totals'] {
  return {
    gross: lines.reduce((sum, line) => sum + line.grossAmount, 0),
    net: lines.reduce((sum, line) => sum + line.netAmount, 0),
    commission: lines.reduce((sum, line) => sum + line.commissionAmount, 0),
    bonus: lines.reduce((sum, line) => sum + line.bonusAmount, 0),
    advanceDeduction: lines.reduce(
      (sum, line) => sum + line.advanceDeduction,
      0,
    ),
    collectionDeduction: lines.reduce(
      (sum, line) => sum + line.collectionDeduction,
      0,
    ),
    otherDeduction: lines.reduce(
      (sum, line) =>
        sum + line.deductions.reduce((inner, row) => inner + row.amount, 0),
      0,
    ),
  }
}

export function subsetPayrollPreview(
  preview: PayrollPreview,
  employeeIds: string[],
): PayrollPreview {
  const idSet = new Set(employeeIds)
  const lines = preview.lines.filter((line) => idSet.has(line.employeeId))

  return {
    ...preview,
    lines,
    totals: totalsFromPayrollLines(lines),
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseSelectedAgentIds(raw?: string): string[] {
  if (!raw?.trim()) return []
  const ids = raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => UUID_RE.test(id))
  return [...new Set(ids)]
}

export function serializeSelectedAgentIds(ids: string[]): string | undefined {
  const unique = [...new Set(ids)]
  return unique.length > 0 ? unique.join(',') : undefined
}

export function reconcileSelectedAgentIds(
  selectedIds: string[],
  availableEmployeeIds: string[],
): string[] {
  const available = new Set(availableEmployeeIds)
  return selectedIds.filter((id) => available.has(id))
}
