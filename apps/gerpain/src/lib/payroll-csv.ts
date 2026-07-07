import { formatPeriodLabel } from '#/lib/period'
import { totalsFromPayrollLines } from '#/lib/payroll-preview-utils'
import type { PayrollPreview } from '#/services/payroll'

function csvCell(value: string | number): string {
  const text = String(value)
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function buildPayrollCsv(preview: PayrollPreview): string {
  const header = [
    'Agent',
    'Rôle',
    'Salaire base',
    'Commission',
    'Primes',
    'Brut',
    'Retenues avances',
    'Retenues caisse',
    'Net à payer',
  ]

  const rows = preview.lines.map((line) => [
    line.employeeName,
    line.role,
    line.baseSalary,
    line.commissionAmount,
    line.bonusAmount,
    line.grossAmount,
    line.advanceDeduction,
    line.collectionDeduction,
    line.netAmount,
  ])

  const totals = preview.totals ?? totalsFromPayrollLines(preview.lines)

  const lines = [
    `# Bulletin paie — ${formatPeriodLabel(preview.startDate, preview.endDate)} (${preview.periodLabel})`,
    header.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
    '',
    [
      'TOTAL',
      '',
      '',
      totals.commission,
      totals.bonus,
      totals.gross,
      totals.advanceDeduction,
      totals.collectionDeduction,
      totals.net,
    ]
      .map(csvCell)
      .join(','),
  ]

  return `${lines.join('\n')}\n`
}

export function downloadPayrollCsv(preview: PayrollPreview, filename: string) {
  const blob = new Blob([buildPayrollCsv(preview)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
