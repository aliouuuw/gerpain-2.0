const frNumber = new Intl.NumberFormat('fr-FR')

export function formatXof(amount: number): string {
  return `${frNumber.format(amount)} XOF`
}

/** Format digits for display in price fields (no currency suffix). */
export function formatXofInput(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return ''
  return frNumber.format(amount)
}

/** Strip spaces and non-digits; keeps only integer FCFA input. */
export function parseXofInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  const value = Number.parseInt(digits, 10)
  if (!Number.isFinite(value) || value <= 0) return ''
  return frNumber.format(value)
}

/** Parse formatted price string to integer FCFA. */
export function xofInputToNumber(raw: string): number {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 0
  return Number.parseInt(digits, 10)
}
