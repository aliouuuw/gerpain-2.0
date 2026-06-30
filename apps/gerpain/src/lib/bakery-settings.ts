import { z } from 'zod'

export const bakerySettingsSchema = z.object({
  /** Default period filter on encaissements / réconciliations */
  defaultPayrollPreset: z.enum(['week', 'month', 'last15']).optional(),
})

export type BakerySettings = z.infer<typeof bakerySettingsSchema>

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
