export function bonusStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: 'Prévue',
    paid: 'Versée',
    cancelled: 'Annulée',
  }
  return labels[status] ?? status
}

export function currentBonusPeriod(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}
