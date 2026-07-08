export const payrollDeductionTypes = [
  'disciplinary',
  'absence',
  'cotisation',
  'other',
] as const

export type PayrollDeductionType = (typeof payrollDeductionTypes)[number]

export type PayrollDeductionLine = {
  id: string
  type: PayrollDeductionType
  label: string
  amount: number
}

export const payrollDeductionTypeLabels: Record<PayrollDeductionType, string> = {
  disciplinary: 'Disciplinaire',
  absence: 'Absence',
  cotisation: 'Cotisation',
  other: 'Autre',
}

export function defaultDeductionLabel(type: PayrollDeductionType): string {
  return payrollDeductionTypeLabels[type]
}

export function sumPayrollDeductions(deductions: PayrollDeductionLine[]): number {
  return deductions.reduce((sum, row) => sum + row.amount, 0)
}

export function netAfterDeductions(input: {
  grossAmount: number
  advanceDeduction: number
  collectionDeduction: number
  deductions: PayrollDeductionLine[]
}): number {
  return Math.max(
    input.grossAmount -
      input.advanceDeduction -
      input.collectionDeduction -
      sumPayrollDeductions(input.deductions),
    0,
  )
}
