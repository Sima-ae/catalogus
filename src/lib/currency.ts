/** ISO-style codes used in settings; extend when adding locales. */
export type ShopCurrencyCode = 'USD' | 'EUR' | 'GBP'

export const SHOP_CURRENCY_SYMBOLS: Record<ShopCurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
}

/** Default storefront currency until per-locale / settings wiring is added. */
export const DEFAULT_SHOP_CURRENCY: ShopCurrencyCode = 'EUR'

const CODE_ALIASES: Record<string, ShopCurrencyCode> = {
  USD: 'USD',
  US: 'USD',
  DOLLAR: 'USD',
  '$': 'USD',
  EUR: 'EUR',
  EURO: 'EUR',
  '€': 'EUR',
  GBP: 'GBP',
  POUND: 'GBP',
  '£': 'GBP',
}

export function normalizeCurrencyCode(
  code: string | null | undefined
): ShopCurrencyCode {
  const key = String(code ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
  return CODE_ALIASES[key] ?? DEFAULT_SHOP_CURRENCY
}

/** Display symbol for a currency code (e.g. USD → $, EUR → €). */
export function getCurrencySymbol(code?: string | null): string {
  return SHOP_CURRENCY_SYMBOLS[normalizeCurrencyCode(code)]
}
