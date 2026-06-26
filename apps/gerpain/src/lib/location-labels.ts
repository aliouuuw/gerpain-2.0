export function locationTypeLabel(type: string): string {
  if (type === 'shop') return 'Boutique'
  if (type === 'warehouse') return 'Dépôt'
  return type
}
