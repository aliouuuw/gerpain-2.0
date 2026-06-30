import { z } from 'zod'

export const shellSearchSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export type ShellSearch = z.infer<typeof shellSearchSchema>

export function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function formatDateLabel(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatDayShort(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Monday-start week containing `centerIso`. */
export function weekRange(centerIso: string): string[] {
  const center = new Date(`${centerIso}T12:00:00`)
  const weekday = center.getDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  const monday = new Date(center)
  monday.setDate(center.getDate() + mondayOffset)

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    return day.toISOString().slice(0, 10)
  })
}

export function weekBounds(centerIso: string): { startDate: string; endDate: string } {
  const days = weekRange(centerIso)
  return { startDate: days[0]!, endDate: days[6]! }
}
