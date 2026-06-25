export function formatXof(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} XOF`
}
