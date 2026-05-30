/** True when price is 0, empty, or not a positive number. */
export function isZeroPrice(value: number | string | null | undefined): boolean {
  if (value == null || value === '') return true
  const n =
    typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(/\s/g, '').replace(',', '.'))
  return !Number.isFinite(n) || n <= 0
}

export type FormatPriceOptions = {
  /** Prefix, default €. Pass empty string when currency is shown separately (e.g. EUR). */
  currency?: string
  /** Shown when price is zero or missing */
  zeroLabel?: string
  /** Use comma as decimal separator (e.g. 12,50) */
  useCommaDecimals?: boolean
}

/** Amount or zero label only — pair with a separate "EUR" prefix. */
export function formatPriceAmount(
  value: number | string | null | undefined,
  options: Omit<FormatPriceOptions, 'currency'> = {}
): string {
  return formatPrice(value, { ...options, currency: '' }).trim()
}

/** Display product/order price; zero → "Price on request" by default. */
export function formatPrice(
  value: number | string | null | undefined,
  options: FormatPriceOptions = {}
): string {
  const {
    currency = '€',
    zeroLabel = 'Price on request',
    useCommaDecimals = true,
  } = options

  if (isZeroPrice(value)) return zeroLabel

  const n =
    typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(/\s/g, '').replace(',', '.'))

  const amount = useCommaDecimals ? n.toFixed(2).replace('.', ',') : n.toFixed(2)
  return `${currency} ${amount}`
}
