import { useRouterState } from '@tanstack/react-router'
import { z } from 'zod'

import {
  formatPeriodLabel,
  periodBounds,
  presetLabel,
  type PeriodPreset,
} from '#/lib/period'

const periodSearchSchema = z.object({
  period: z.enum(['week', 'month', 'last15', 'custom']).optional(),
  start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export type ShellBarMode = 'home' | 'day' | 'period'

export function useShellBarMode(): {
  mode: ShellBarMode
  periodLabel?: string
  periodPreset?: PeriodPreset
} {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const rawSearch = useRouterState({ select: (s) => s.location.search })

  if (pathname === '/') {
    return { mode: 'home' }
  }

  if (
    pathname.startsWith('/encaissements') ||
    pathname.startsWith('/reconciliations')
  ) {
    const parsed = periodSearchSchema.safeParse(rawSearch)
    const search = parsed.success ? parsed.data : {}
    const preset: PeriodPreset = search.period ?? 'week'
    const { startDate, endDate } = periodBounds(
      preset,
      search.start,
      search.end,
    )

    return {
      mode: 'period',
      periodLabel: `${presetLabel(preset)} · ${formatPeriodLabel(startDate, endDate)}`,
      periodPreset: preset,
    }
  }

  return { mode: 'day' }
}
