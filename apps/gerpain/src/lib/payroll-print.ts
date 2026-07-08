import { formatXof } from '#/lib/format-money'
import { formatPeriodLabel } from '#/lib/period'
import { employeeRoleLabel } from '#/lib/employee-labels'
import { subsetPayrollPreview } from '#/lib/payroll-preview-utils'
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

/** Open printable HTML in a new tab (blob URL — avoids blank noopener windows). */
export function openPayrollHtmlPreview(
  preview: PayrollPreview,
  bakeryName?: string,
): void {
  const html = buildPayrollPrintHtml(preview, bakeryName)
  openHtmlInNewTab(html)
}

export function openPayrollLinePreview(
  preview: PayrollPreview,
  employeeId: string,
  bakeryName?: string,
): void {
  const line = preview.lines.find((row) => row.employeeId === employeeId)
  if (!line) return

  const singleLinePreview: PayrollPreview = {
    ...preview,
    hasDraft: preview.hasDraft ?? false,
    lines: [line],
    totals: {
      gross: line.grossAmount,
      net: line.netAmount,
      commission: line.commissionAmount,
      bonus: line.bonusAmount,
      advanceDeduction: line.advanceDeduction,
      collectionDeduction: line.collectionDeduction,
      otherDeduction: line.deductions.reduce((sum, row) => sum + row.amount, 0),
    },
  }

  openPayrollHtmlPreview(singleLinePreview, bakeryName)
}

export function openPayrollBulletinsPreview(
  preview: PayrollPreview,
  employeeIds: string[] | undefined,
  bakeryName?: string,
): void {
  const target =
    employeeIds && employeeIds.length > 0
      ? subsetPayrollPreview(preview, employeeIds)
      : preview

  if (target.lines.length === 0) return

  if (target.lines.length === 1) {
    openPayrollLinePreview(preview, target.lines[0]!.employeeId, bakeryName)
    return
  }

  const periodTitle = formatPeriodLabel(preview.startDate, preview.endDate)
  const bakeryLabel = bakeryName ? `${escapeHtml(bakeryName)} — ` : ''

  const sections = target.lines
    .map((line) => {
      const single = subsetPayrollPreview(target, [line.employeeId])
      const sectionHtml = buildPayrollPrintHtml(single, bakeryName)
      const tableMatch = sectionHtml.match(/<table[\s\S]*<\/table>/)
      const metaMatch = sectionHtml.match(/<p class="meta">[\s\S]*?<\/p>/)
      return `<section class="bulletin-page">
  <h2>${escapeHtml(line.employeeName)}</h2>
  ${metaMatch?.[0] ?? ''}
  ${tableMatch?.[0] ?? ''}
</section>`
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${bakeryLabel}Bulletins de paie — ${escapeHtml(periodTitle)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; color: #111; margin: 24px; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 15px; margin: 16px 0 8px; }
    .meta { color: #555; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; }
    th { background: #f3f3f3; }
    td.num, th.num { text-align: right; }
    @media print {
      .bulletin-page { break-after: page; page-break-after: always; }
      .bulletin-page:last-child { break-after: auto; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <h1>${bakeryLabel}Bulletins de paie</h1>
  <p class="meta">Période : ${escapeHtml(periodTitle)} · ${target.lines.length} agent(s)</p>
  ${sections}
</body>
</html>`

  openHtmlInNewTab(html)
}

function openHtmlInNewTab(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const tab = window.open(url, '_blank', 'noopener')
  if (!tab) {
    URL.revokeObjectURL(url)
    return
  }
  tab.addEventListener('load', () => {
    URL.revokeObjectURL(url)
  })
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
