import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { employeeRoleLabel } from '#/lib/employee-labels'
import { formatXofPdf } from '#/lib/format-money'
import { formatPeriodLabel } from '#/lib/period'
import { subsetPayrollPreview } from '#/lib/payroll-preview-utils'
import {
  payrollDeductionTypeLabels,
  sumPayrollDeductions,
} from '#/lib/payroll-deduction-lines'
import type { PayrollLinePreview, PayrollPreview } from '#/services/payroll'

const MARGIN = 16
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const INNER = PAGE_WIDTH - MARGIN * 2
/** Matches .fiche-details__row grid (≈40% label / valeur). */
const LABEL_COL_W = 72
const VALUE_COL_X = MARGIN + LABEL_COL_W
const VALUE_COL_W = INNER - LABEL_COL_W

/** Uber-sharp + warm neutrals — apps/gerpain/src/styles/shell.css */
const C = {
  text: [0, 0, 0] as const,
  text2: [94, 90, 84] as const,
  text3: [175, 170, 163] as const,
  border: [232, 228, 223] as const,
  surface2: [240, 238, 235] as const,
  accent: [0, 0, 0] as const,
}

function hr(doc: jsPDF, y: number): void {
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)
}

function sectionLabel(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C.text)
  doc.text(text, MARGIN, y)
  return y + 6
}

function ficheRow(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  options?: { meta?: string; emphasis?: boolean; muted?: boolean; skipBorder?: boolean },
): number {
  const valueRight = VALUE_COL_X + VALUE_COL_W

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...C.text2)
  doc.text(label, MARGIN, y)

  doc.setFont('helvetica', options?.emphasis ? 'bold' : 'normal')
  doc.setFontSize(options?.emphasis ? 11 : 10)
  if (options?.muted) {
    doc.setTextColor(...C.text2)
  } else {
    doc.setTextColor(...C.text)
  }
  doc.text(value, valueRight, y, { align: 'right' })

  let next = y + 5

  if (options?.meta) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.text3)
    const lines = doc.splitTextToSize(options.meta, VALUE_COL_W)
    doc.text(lines, valueRight, next, { align: 'right' })
    next += lines.length * 3.2 + 1
  }

  if (options?.skipBorder) {
    return next + 2
  }

  hr(doc, next + 2)
  return next + 6
}

function statsStrip(
  doc: jsPDF,
  y: number,
  line: PayrollLinePreview,
): number {
  const cols = [
    { label: 'Net à payer', value: formatXofPdf(line.netAmount) },
    { label: 'Brut total', value: formatXofPdf(line.grossAmount) },
    {
      label: 'Retenues',
      value: formatXofPdf(line.advanceDeduction + line.collectionDeduction),
    },
  ]
  const colW = INNER / 3

  hr(doc, y)
  let rowY = y + 8

  cols.forEach((col, index) => {
    const x = MARGIN + index * colW
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.text3)
    doc.text(col.label.toUpperCase(), x, rowY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(index === 0 ? 13 : 11)
    doc.setTextColor(...C.text)
    doc.text(col.value, x, rowY + 6)
  })

  rowY += 16
  hr(doc, rowY)
  return rowY + 8
}

function commissionMeta(line: PayrollLinePreview): string | undefined {
  if (line.role !== 'delivery' || line.commissionAmount <= 0) return undefined
  const parts = [
    `${line.commissionUnitsCommissioned} u. commissionnée${line.commissionUnitsCommissioned > 1 ? 's' : ''}`,
    `${line.commissionValidatedRuns} tournée${line.commissionValidatedRuns > 1 ? 's' : ''} validée${line.commissionValidatedRuns > 1 ? 's' : ''}`,
  ]
  if (line.commissionUnitsSold > line.commissionUnitsCommissioned) {
    parts.push(
      `${line.commissionUnitsSold - line.commissionUnitsCommissioned} u. à 0`,
    )
  }
  return parts.join(' · ')
}

function advanceMeta(line: PayrollLinePreview): string | undefined {
  if (line.advanceDeduction <= 0) return undefined
  const n = line.advanceInstallments.length
  return `${n} échéance${n > 1 ? 's' : ''} · déduit du net`
}

function collectionMeta(line: PayrollLinePreview): string | undefined {
  if (!line.collectionBalance || line.role !== 'delivery') return undefined
  const b = line.collectionBalance
  if (line.collectionDeduction > 0) {
    return `${formatXofPdf(b.totalCollected)} collecté sur ${formatXofPdf(b.totalExpected)} · déduit du net`
  }
  const solde =
    b.solde === 0
      ? 'équilibré'
      : b.solde < 0
        ? 'manque'
        : 'excédent'
  return `${formatXofPdf(b.totalCollected)} collecté sur ${formatXofPdf(b.totalExpected)} (${solde})`
}

function bonusMeta(line: PayrollLinePreview): string | undefined {
  if (line.bonuses.length === 0) return undefined
  return `${line.bonuses.length} prime${line.bonuses.length > 1 ? 's' : ''}`
}

function drawDetailBlock(
  doc: jsPDF,
  line: PayrollLinePreview,
  startY: number,
): number {
  let y = sectionLabel(doc, 'Détail', startY)

  y = ficheRow(doc, y, 'Salaire de base', formatXofPdf(line.baseSalary))

  if (line.commissionAmount > 0 || line.commissionProducts.length > 0) {
    y = ficheRow(doc, y, 'Commission produits', formatXofPdf(line.commissionAmount), {
      meta: commissionMeta(line),
    })
  }

  if (line.bonusAmount > 0) {
    y = ficheRow(doc, y, 'Primes', `+ ${formatXofPdf(line.bonusAmount)}`, {
      meta: bonusMeta(line),
    })
  }

  if (line.advanceDeduction > 0) {
    const hasInstallments = line.advanceInstallments.length > 0
    y = ficheRow(doc, y, 'Retenues avances', formatXofPdf(line.advanceDeduction), {
      meta: advanceMeta(line),
      muted: true,
      skipBorder: hasInstallments,
    })
    if (hasInstallments) {
      y = drawNestedTable(
        doc,
        y,
        ['Échéance', 'Période due', 'Montant'],
        line.advanceInstallments.map((i) => [
          `n° ${i.installmentNumber}`,
          i.duePeriod ?? '—',
          formatXofPdf(i.amount),
        ]),
      )
      hr(doc, y)
      y += 6
    }
  }

  if (line.collectionBalance) {
    const label =
      line.collectionDeduction > 0
        ? 'Retenue caisse (manque)'
        : 'Solde encaissements'
    const value =
      line.collectionDeduction > 0
        ? formatXofPdf(line.collectionDeduction)
        : formatXofPdf(Math.abs(line.collectionBalance.solde))
    y = ficheRow(doc, y, label, value, {
      meta: collectionMeta(line),
      muted: line.collectionDeduction > 0,
    })
  }

  if (line.deductions.length > 0) {
    const otherTotal = sumPayrollDeductions(line.deductions)
    y = ficheRow(doc, y, 'Autres retenues', formatXofPdf(otherTotal), {
      meta: `${line.deductions.length} ligne${line.deductions.length > 1 ? 's' : ''}`,
      muted: true,
      skipBorder: true,
    })
    y = drawNestedTable(
      doc,
      y,
      ['Type', 'Libellé', 'Montant'],
      line.deductions.map((row) => [
        payrollDeductionTypeLabels[row.type],
        row.label,
        formatXofPdf(row.amount),
      ]),
    )
    hr(doc, y)
    y += 6
  }

  y = ficheRow(doc, y, 'Net à payer', formatXofPdf(line.netAmount), {
    emphasis: true,
  })

  return y
}

function drawCompactTable(
  doc: jsPDF,
  y: number,
  head: string[],
  body: string[][],
): number {
  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: C.text[0],
      lineColor: [C.border[0], C.border[1], C.border[2]],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [C.surface2[0], C.surface2[1], C.surface2[2]],
      textColor: C.text2[0],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: Object.fromEntries(
      head.map((_, i) => [
        i,
        { halign: i === 0 ? 'left' : 'right' as const },
      ]),
    ),
    margin: { left: MARGIN, right: MARGIN },
    theme: 'plain',
  })

  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY + 6
}

/** Compact table nested under a fiche row (no section heading). */
function drawNestedTable(
  doc: jsPDF,
  y: number,
  head: string[],
  body: string[][],
): number {
  return drawCompactTable(doc, y + 2, head, body) - 4
}

function drawSupplementaryTables(
  doc: jsPDF,
  line: PayrollLinePreview,
  startY: number,
): number {
  let y = startY

  if (line.role === 'delivery' && line.commissionProducts.length > 0) {
    y = sectionLabel(doc, 'Commission par produit', y)
    y = drawCompactTable(
      doc,
      y,
      ['Produit', 'Vendu', 'Commission / u', 'Sous-total'],
      line.commissionProducts.map((p) => [
        p.productName,
        String(p.unitsSold),
        formatXofPdf(p.commissionPerUnit),
        formatXofPdf(p.commissionAmount),
      ]),
    )
  }

  if (line.bonuses.length > 0) {
    y = sectionLabel(doc, 'Primes', y)
    y = drawCompactTable(
      doc,
      y,
      ['Période due', 'Motif', 'Montant'],
      line.bonuses.map((b) => [
        b.duePeriod,
        b.reason ?? '—',
        formatXofPdf(b.amount),
      ]),
    )
  }

  if (line.manualReason) {
    y = sectionLabel(doc, 'Note', y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...C.text2)
    const note = doc.splitTextToSize(line.manualReason, INNER)
    doc.text(note, MARGIN, y)
    y += note.length * 4 + 4
  }

  return y
}

function drawPageHeader(
  doc: jsPDF,
  bakeryName: string | undefined,
  preview: PayrollPreview,
): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...C.text)
  doc.text(bakeryName || 'Entreprise', MARGIN, 22)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...C.text2)
  const periodTitle = formatPeriodLabel(preview.startDate, preview.endDate)
  const status = preview.isClosed ? 'Clôturée' : 'Aperçu'
  doc.text(
    `Bulletin de paie · ${periodTitle} (${preview.periodLabel}) · ${status}`,
    MARGIN,
    29,
  )

  hr(doc, 34)
  return 38
}

function drawIdentityBlock(
  doc: jsPDF,
  line: PayrollLinePreview,
  preview: PayrollPreview,
  startY: number,
): number {
  let y = startY
  y = ficheRow(doc, y, 'Agent', line.employeeName)
  y = ficheRow(doc, y, 'Fonction', employeeRoleLabel(line.role))
  y = ficheRow(
    doc,
    y,
    'Période',
    formatPeriodLabel(preview.startDate, preview.endDate),
  )
  if (line.lineSource === 'manual' || line.lineSource === 'override') {
    y = ficheRow(
      doc,
      y,
      'Ligne',
      line.lineSource === 'manual' ? 'Manuelle' : 'Ajustée',
    )
  }
  return y + 2
}

function drawFooter(doc: jsPDF, isClosed: boolean): void {
  const y = PAGE_HEIGHT - 20
  hr(doc, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.text3)
  doc.text(
    isClosed
      ? 'Bulletin clôturé — montants figurés au registre de paie.'
      : 'Aperçu avant clôture — ne pas remettre en paiement sans validation.',
    MARGIN,
    y + 5,
  )

  const sig = "Pour l'employeur — signature / cachet"
  doc.text(sig, PAGE_WIDTH - MARGIN - doc.getTextWidth(sig), y + 12)
}

function renderBulletinPage(
  doc: jsPDF,
  line: PayrollLinePreview,
  preview: PayrollPreview,
  bakeryName: string | undefined,
  isFirstPage: boolean,
): void {
  if (!isFirstPage) doc.addPage()

  let y = drawPageHeader(doc, bakeryName, preview)
  y = drawIdentityBlock(doc, line, preview, y)
  y = statsStrip(doc, y, line)
  y = drawDetailBlock(doc, line, y)
  y = drawSupplementaryTables(doc, line, y + 4)
  drawFooter(doc, preview.isClosed)
}

function payrollPdfFilename(preview: PayrollPreview, suffix = 'paie'): string {
  return `${suffix}-${preview.periodLabel}.pdf`
}

function employeePdfFilename(
  line: PayrollLinePreview,
  preview: PayrollPreview,
): string {
  const safeName = line.employeeName
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
  return `bulletin-${safeName || line.employeeId}-${preview.periodLabel}.pdf`
}

export function downloadPayrollPdf(
  preview: PayrollPreview,
  bakeryName?: string,
  filename?: string,
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  preview.lines.forEach((line, index) => {
    renderBulletinPage(doc, line, preview, bakeryName, index === 0)
  })

  doc.save(filename ?? payrollPdfFilename(preview))
}

export function downloadPayrollLinePdf(
  preview: PayrollPreview,
  employeeId: string,
  bakeryName?: string,
): void {
  const line = preview.lines.find((row) => row.employeeId === employeeId)
  if (!line) return

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  renderBulletinPage(doc, line, preview, bakeryName, true)
  doc.save(employeePdfFilename(line, preview))
}

export function downloadPayrollBulletinsPdf(
  preview: PayrollPreview,
  employeeIds: string[] | undefined,
  bakeryName?: string,
): void {
  const target =
    employeeIds && employeeIds.length > 0
      ? subsetPayrollPreview(preview, employeeIds)
      : preview

  if (target.lines.length === 0) return

  downloadPayrollPdf(target, bakeryName, payrollPdfFilename(target, 'bulletins'))
}
