export function advanceStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'En cours'
    case 'closed':
      return 'Soldée'
    case 'cancelled':
      return 'Annulée'
    default:
      return status
  }
}

export function installmentStatusLabel(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'Planifiée'
    case 'paid':
      return 'Remboursée'
    case 'rolled_over':
      return 'Reportée'
    case 'skipped':
      return 'Ignorée'
    default:
      return status
  }
}

export function repaymentMethodLabel(method: string): string {
  switch (method) {
    case 'payroll_deduction':
      return 'Retenue paie'
    case 'cash':
      return 'Espèces'
    default:
      return method
  }
}
