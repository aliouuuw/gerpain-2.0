import { formatXof } from '#/lib/format-money'
import { formatPeriodLabel } from '#/lib/period'
import { employeeRoleLabel } from '#/lib/employee-labels'
import type { PayrollPreview } from '#/services/payroll'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildPayrollPrintHtml(
  preview: PayrollPreview,
  bakeryName?: string,
): string {
  const periodTitle = formatPeriodLabel(preview.startDate, preview.endDate)
  const header = bakeryName
    ? `${escapeHtml(bakeryName)} — Bulletin de paie`
    : 'Bulletin de paie'

  const rows = preview.lines
    .map(
      (line) => `
        <tr>
          <td>${escapeHtml(line.employeeName)}</td>
          <td>${escapeHtml(employeeRoleLabel(line.role))}</td>
          <td class="num">${formatXof(line.baseSalary)}</td>
          <td class="num">${formatXof(line.commissionAmount)}</td>
          <td class="num">${formatXof(line.bonusAmount)}</td>
          <td class="num">${formatXof(line.grossAmount)}</td>
          <td class="num">${formatXof(line.advanceDeduction)}</td>
          <td class="num">${formatXof(line.collectionDeduction)}</td>
          <td class="num"><strong>${formatXof(line.netAmount)}</strong></td>
        </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${header} — ${escapeHtml(periodTitle)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      color: #111;
      margin: 24px;
      font-size: 12px;
      line-height: 1.4;
    }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { color: #555; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th { background: #f3f3f3; font-weight: 600; }
    td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
    tfoot td { font-weight: 600; background: #fafafa; }
    @media print {
      body { margin: 12mm; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <h1>${header}</h1>
  <p class="meta">
    Période : ${escapeHtml(periodTitle)} (${escapeHtml(preview.periodLabel)})
    ${preview.isClosed ? ' · Clôturée' : ' · Aperçu'}
  </p>
  <table>
    <thead>
      <tr>
        <th>Agent</th>
        <th>Rôle</th>
        <th class="num">Base</th>
        <th class="num">Commission</th>
        <th class="num">Primes</th>
        <th class="num">Brut</th>
        <th class="num">Avances</th>
        <th class="num">Caisse</th>
        <th class="num">Net</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">Total</td>
        <td class="num"></td>
        <td class="num">${formatXof(preview.totals.commission)}</td>
        <td class="num">${formatXof(preview.totals.bonus)}</td>
        <td class="num">${formatXof(preview.totals.gross)}</td>
        <td class="num">${formatXof(preview.totals.advanceDeduction)}</td>
        <td class="num">${formatXof(preview.totals.collectionDeduction)}</td>
        <td class="num">${formatXof(preview.totals.net)}</td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`
}

export function printPayrollBulletin(
  preview: PayrollPreview,
  bakeryName?: string,
): void {
  const html = buildPayrollPrintHtml(preview, bakeryName)
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) return

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  const triggerPrint = () => {
    printWindow.print()
  }

  printWindow.onload = triggerPrint
  window.setTimeout(triggerPrint, 300)
}
