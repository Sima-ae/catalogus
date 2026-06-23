/** Parse a decimal price from an input field (comma or dot decimals). */
export function parsePriceInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

/** Seed value for a price input from a stored amount. */
export function priceInputSeed(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  return String(value)
}
