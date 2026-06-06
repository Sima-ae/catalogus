export type WooStorePrices = {
  price: string
  regular_price: string
  sale_price: string
  currency_code: string
  currency_minor_unit: number
}

export type WooStoreBrand = {
  id: number
  name: string
  slug: string
  link?: string
}

export type WooStoreCategory = {
  id: number
  name: string
  slug: string
  link?: string
}

export type WooStoreImage = {
  id: number
  src: string
  thumbnail?: string
  alt?: string
  name?: string
}

export type WooStoreProduct = {
  id: number
  name: string
  slug: string
  sku: string
  permalink: string
  short_description: string
  description: string
  prices: WooStorePrices
  images: WooStoreImage[]
  categories: WooStoreCategory[]
  brands: WooStoreBrand[]
  on_sale?: boolean
}

export type WooProductListItem = {
  productId: string
  externalId: string
  permalink: string
  title: string
}

export type WooProductData = {
  productId: number
  externalId: string
  name: string
  sku: string
  permalink: string
  description: string
  shortDescription: string
  price: number
  originalPrice: number | null
  currency: string
  imageUrls: string[]
  brandName: string | null
  categoryName: string | null
}

export function wooExternalId(productId: number | string): string {
  return `wc-${productId}`
}

export function parseWooExternalId(externalId: string): number | null {
  const match = /^wc-(\d+)$/.exec(String(externalId).trim())
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}

/** Queued from admin “Import product URL” before the worker resolves the numeric id. */
export function wooSlugExternalId(slug: string): string {
  return `wc-slug-${slug.trim()}`
}

export function parseWooSlugExternalId(externalId: string): string | null {
  const match = /^wc-slug-(.+)$/.exec(String(externalId).trim())
  return match?.[1]?.trim() || null
}

export function wooPriceToDecimal(prices: WooStorePrices | null | undefined): {
  price: number
  originalPrice: number | null
} {
  if (!prices) return { price: 0, originalPrice: null }
  const minor = Number(prices.currency_minor_unit ?? 2)
  const divisor = 10 ** (Number.isFinite(minor) ? minor : 2)

  const parseMinor = (raw: string | null | undefined): number | null => {
    const n = Number(String(raw ?? '').trim())
    if (!Number.isFinite(n) || n <= 0) return null
    return Math.round((n / divisor) * 100) / 100
  }

  const sale = parseMinor(prices.sale_price)
  const regular = parseMinor(prices.regular_price)
  const base = parseMinor(prices.price)
  const price = sale ?? base ?? regular ?? 0
  const originalPrice =
    regular != null && sale != null && regular > sale ? regular : regular != null && price > 0 && regular > price ? regular : null

  return { price, originalPrice }
}

export function decodeWooHtmlEntities(text: string): string {
  return text
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    .replace(/&#038;/g, '&')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
