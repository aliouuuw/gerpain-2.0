import { todayIso } from '#/lib/today'

export type PeriodPreset = 'week' | 'month' | 'last15' | 'custom'

export function periodBounds(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string,
): { startDate: string; endDate: string } {
  const today = todayIso()

  switch (preset) {
    case 'week': {
      const d = new Date()
      const day = d.getDay() || 7
      const monday = new Date(d)
      monday.setDate(d.getDate() - day + 1)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return {
        startDate: formatDateIso(monday),
        endDate: formatDateIso(sunday),
      }
    }
    case 'month': {
      const d = new Date()
      const first = new Date(d.getFullYear(), d.getMonth(), 1)
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      return {
        startDate: formatDateIso(first),
        endDate: formatDateIso(last),
      }
    }
    case 'last15': {
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 14)
      return {
        startDate: formatDateIso(start),
        endDate: formatDateIso(end),
      }
    }
    case 'custom':
    default:
      return {
        startDate: customStart || today,
        endDate: customEnd || today,
      }
  }
}

export function presetLabel(preset: PeriodPreset): string {
  const labels: Record<PeriodPreset, string> = {
    week: 'Cette semaine',
    month: 'Ce mois',
    last15: '15 derniers jours',
    custom: 'Personnalisée',
  }
  return labels[preset]
}

export function formatDateIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatPeriodLabel(startDate: string, endDate: string): string {
  const sameMonth = startDate.slice(0, 7) === endDate.slice(0, 7)
  if (sameMonth) {
    return `${formatShortDate(startDate)} – ${formatShortDate(endDate)}`
  }
  return `${formatMediumDate(startDate)} – ${formatMediumDate(endDate)}`
}

function formatShortDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${monthName(Number(month))} ${year}`
}

function formatMediumDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${Number(day)} ${monthName(Number(month))} ${year}`
}

function monthName(month: number): string {
  const names = [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ]
  return names[month - 1] ?? ''
}

/** YYYY-MM label for advance due periods and payroll close. */
export function periodLabelFromEndDate(endDate: string): string {
  return endDate.slice(0, 7)
}
