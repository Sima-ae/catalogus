import {
  DEFAULT_SHOP_CURRENCY,
  getCurrencySymbol,
  normalizeCurrencyCode,
  type ShopCurrencyCode,
} from '@/lib/currency'

let activeShopCurrencyCode: ShopCurrencyCode = DEFAULT_SHOP_CURRENCY

/** Set from ShopCurrencyProvider after loading public settings. */
export function setActiveShopCurrencyCode(code: string | null | undefined) {
  activeShopCurrencyCode = normalizeCurrencyCode(code ?? DEFAULT_SHOP_CURRENCY)
}

export function getActiveShopCurrencyCode(): ShopCurrencyCode {
  return activeShopCurrencyCode
}

/** Show strikethrough MSRP when original is above the public price (including price on request). */
export function hasPublicOriginalPrice(
  originalPrice: number | string | null | undefined,
  price: number | string | null | undefined
): boolean {
  if (isZeroPrice(originalPrice)) return false
  const original =
    typeof originalPrice === 'number'
      ? originalPrice
      : parseFloat(String(originalPrice).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(original) || original <= 0) return false
  if (isZeroPrice(price)) return true
  const current =
    typeof price === 'number'
      ? price
      : parseFloat(String(price).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(current) && original > current
}

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
  /** Override symbol (e.g. "€"). Defaults from `currencyCode`. */
  currency?: string
  /** ISO code from settings / locale (USD, EUR, …). */
  currencyCode?: string | null
  /** Shown when price is zero or missing */
  zeroLabel?: string
  /** Use comma as decimal separator (e.g. 12,50) */
  useCommaDecimals?: boolean
}

function resolveCurrencySymbol(options: FormatPriceOptions): string {
  if (options.currency !== undefined && options.currency !== '') {
    return options.currency
  }
  return getCurrencySymbol(options.currencyCode ?? activeShopCurrencyCode)
}

/** Numeric amount only (no currency symbol) — pair with a separate currency symbol. */
export function formatPriceAmount(
  value: number | string | null | undefined,
  options: Omit<FormatPriceOptions, 'currency'> = {}
): string {
  const { zeroLabel = 'Price on request', useCommaDecimals = true } = options
  if (isZeroPrice(value)) return zeroLabel
  const n =
    typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n)) return zeroLabel
  return useCommaDecimals ? n.toFixed(2).replace('.', ',') : n.toFixed(2)
}

/** Display product/order price; zero → "Price on request" by default. */
export function formatPrice(
  value: number | string | null | undefined,
  options: FormatPriceOptions = {}
): string {
  const {
    zeroLabel = 'Price on request',
    useCommaDecimals = true,
  } = options

  const currency = resolveCurrencySymbol(options)

  if (isZeroPrice(value)) return zeroLabel

  const n =
    typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(/\s/g, '').replace(',', '.'))

  const amount = useCommaDecimals ? n.toFixed(2).replace('.', ',') : n.toFixed(2)
  return `${currency} ${amount}`
}

export { normalizeCurrencyCode, type ShopCurrencyCode }
