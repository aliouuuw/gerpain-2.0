export type PayrollLineComputedAmounts = {
  baseSalary: number
  commissionAmount: number
  bonusAmount: number
  advanceDeduction: number
  collectionDeduction: number
  grossAmount: number
  netAmount: number
}

export type PayrollAmountField = keyof PayrollLineComputedAmounts

export type PayrollLineDiffRow = {
  field: PayrollAmountField
  label: string
  before: number
  after: number
  delta: number
}

const FIELD_LABELS: Record<PayrollAmountField, string> = {
  baseSalary: 'Salaire de base',
  commissionAmount: 'Commission',
  bonusAmount: 'Primes',
  advanceDeduction: 'Retenues avances',
  collectionDeduction: 'Retenue caisse',
  grossAmount: 'Brut',
  netAmount: 'Net à payer',
}

const DIFF_FIELDS: PayrollAmountField[] = [
  'baseSalary',
  'commissionAmount',
  'bonusAmount',
  'advanceDeduction',
  'collectionDeduction',
  'grossAmount',
  'netAmount',
]

export function amountsFromPayrollLine(line: {
  baseSalary: number
  commissionAmount: number
  bonusAmount: number
  advanceDeduction: number
  collectionDeduction: number
  grossAmount: number
  netAmount: number
}): PayrollLineComputedAmounts {
  return {
    baseSalary: line.baseSalary,
    commissionAmount: line.commissionAmount,
    bonusAmount: line.bonusAmount,
    advanceDeduction: line.advanceDeduction,
    collectionDeduction: line.collectionDeduction,
    grossAmount: line.grossAmount,
    netAmount: line.netAmount,
  }
}

export function payrollLineDiff(
  before: PayrollLineComputedAmounts,
  after: PayrollLineComputedAmounts,
): PayrollLineDiffRow[] {
  return DIFF_FIELDS.map((field) => ({
    field,
    label: FIELD_LABELS[field],
    before: before[field],
    after: after[field],
    delta: after[field] - before[field],
  })).filter((row) => row.delta !== 0)
}

export type PayrollLineDetailMeta = {
  source?: 'manual' | 'override'
  manualReason?: string | null
  computedAmounts?: PayrollLineComputedAmounts
}

export function parsePayrollLineDetailMeta(
  raw: unknown,
): PayrollLineDetailMeta | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const computedAmounts = row.computedAmounts
  return {
    source:
      row.source === 'manual' || row.source === 'override'
        ? row.source
        : undefined,
    manualReason:
      typeof row.manualReason === 'string' ? row.manualReason : null,
    computedAmounts:
      computedAmounts &&
      typeof computedAmounts === 'object' &&
      'netAmount' in computedAmounts
        ? (computedAmounts as PayrollLineComputedAmounts)
        : undefined,
  }
}

export function closeDetailSnapshot(
  line: {
    lineSource?: 'computed' | 'manual' | 'override'
    manualReason?: string | null
    computedAmounts?: PayrollLineComputedAmounts | null
  } & PayrollLineComputedAmounts,
  detailFields: Record<string, unknown>,
): Record<string, unknown> {
  if (line.lineSource === 'manual' || line.lineSource === 'override') {
    return {
      ...detailFields,
      source: line.lineSource,
      manualReason: line.manualReason ?? null,
      ...(line.lineSource === 'override' && line.computedAmounts
        ? { computedAmounts: line.computedAmounts }
        : {}),
    }
  }
  return detailFields
}
