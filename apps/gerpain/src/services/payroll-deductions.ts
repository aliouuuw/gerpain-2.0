import type { PayrollCollectionBalancePreview } from '#/services/payroll'

export type CollectionDeductionOptions = {
  /** Share of shortfall to deduct (0–100). Default 100. */
  ratePercent?: number
  /** Optional max deduction in FCFA. */
  capAmount?: number | null
}

/** Manque caisse (expected > collected) deducted from net pay. */
export function collectionShortfallDeduction(
  balance: PayrollCollectionBalancePreview | null,
  options?: CollectionDeductionOptions,
): number {
  if (!balance || balance.solde >= 0) return 0

  const shortfall = Math.abs(balance.solde)
  const ratePercent = options?.ratePercent ?? 100
  const scaled = Math.round((shortfall * ratePercent) / 100)

  const cap = options?.capAmount
  if (cap !== undefined && cap !== null && cap >= 0) {
    return Math.min(scaled, cap)
  }

  return scaled
}
