export function employeeRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    delivery: 'Livreur',
    cashier: 'Caissier',
    manager: 'Responsable',
    baker: 'Boulanger',
  }
  return labels[role] ?? role
}

export function employeeInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}
