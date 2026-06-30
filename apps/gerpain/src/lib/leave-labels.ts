export function leaveTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    annual: 'Congé',
    sick: 'Maladie',
    other: 'Autre',
  }
  return labels[type] ?? type
}

export function leaveStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Rejeté',
    cancelled: 'Annulé',
  }
  return labels[status] ?? status
}
