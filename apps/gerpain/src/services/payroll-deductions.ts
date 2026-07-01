import type { PayrollCollectionBalancePreview } from '#/services/payroll'

/** Manque caisse (expected > collected) deducted from net pay. */
export function collectionShortfallDeduction(
  balance: PayrollCollectionBalancePreview | null,
): number {
  if (!balance || balance.solde >= 0) return 0
  return Math.abs(balance.solde)
}
