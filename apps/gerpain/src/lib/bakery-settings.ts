import { z } from 'zod'

export const DEFAULT_COLLECTION_DEDUCTION_RATE = 100

export const bakerySettingsSchema = z.object({
  /** Default period filter on encaissements / réconciliations */
  defaultPayrollPreset: z.enum(['week', 'month', 'last15']).optional(),
  /** Share of cash shortfall deducted from net pay (0–100). Default 100. */
  collectionDeductionRate: z.number().int().min(0).max(100).optional(),
  /** Optional ceiling on collection shortfall deduction per employee (FCFA). */
  collectionDeductionCap: z.number().int().min(0).nullable().optional(),
})

export type BakerySettings = z.infer<typeof bakerySettingsSchema>

export function collectionDeductionOptionsFromSettings(
  settings: BakerySettings,
): { ratePercent: number; capAmount: number | null | undefined } {
  return {
    ratePercent: settings.collectionDeductionRate ?? DEFAULT_COLLECTION_DEDUCTION_RATE,
    capAmount: settings.collectionDeductionCap,
  }
}

export function parseBakerySettings(
  raw: string | null | undefined,
): BakerySettings {
  if (!raw || raw === '{}') return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    const result = bakerySettingsSchema.safeParse(parsed)
    return result.success ? result.data : {}
  } catch {
    return {}
  }
}

export function serializeBakerySettings(settings: BakerySettings): string {
  return JSON.stringify(settings)
}

export const payrollPresetLabels: Record<
  NonNullable<BakerySettings['defaultPayrollPreset']>,
  string
> = {
  week: 'Cette semaine',
  month: 'Ce mois',
  last15: '15 derniers jours',
}
