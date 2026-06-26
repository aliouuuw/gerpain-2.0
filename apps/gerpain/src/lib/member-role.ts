export function memberRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Opérateur'
  if (role === 'owner' || role === 'admin') return 'Responsable'
  return 'Opérateur'
}

export function userInitials(
  name: string | null | undefined,
  email: string,
): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}
