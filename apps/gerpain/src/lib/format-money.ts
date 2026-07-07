const frNumber = new Intl.NumberFormat('fr-FR')

/** Plain space thousands — safe for jsPDF Helvetica (avoids U+202F rendering as "/"). */
export function formatFrInteger(amount: number): string {
  return frNumber.format(amount).replace(/[\u202f\u00a0]/g, ' ')
}

export function formatXof(amount: number): string {
  return `${formatFrInteger(amount)} XOF`
}

/** PDF / print output where narrow no-break spaces break in built-in fonts. */
export function formatXofPdf(amount: number): string {
  return formatXof(amount)
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
