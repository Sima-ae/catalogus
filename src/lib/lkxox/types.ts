export type LkxoxListItem = {
  productId: number
  externalId: string
  permalink: string
  title: string
}

export type LkxoxProductData = {
  productId: number
  externalId: string
  name: string
  sku: string
  permalink: string
  description: string
  price: number
  originalPrice: number | null
  brandName: string | null
  imageUrls: string[]
}

const PRODUCT_ID_RE = /-p-(\d+)\.html(?:\?|$)/i

export function parseLkxoxProductIdFromUrl(url: string): number | null {
  const match = String(url ?? '').match(PRODUCT_ID_RE)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) && id > 0 ? id : null
}

export function lkxoxExternalId(productId: number | string): string {
  const id = String(productId ?? '').trim()
  if (!id) throw new Error('Lkxox product id is required')
  return `lkxox-${id}`
}

export function parseLkxoxExternalId(externalId: string): number | null {
  const raw = String(externalId ?? '').trim()
  if (!raw.startsWith('lkxox-')) return null
  const id = Number(raw.slice('lkxox-'.length))
  return Number.isFinite(id) && id > 0 ? id : null
}

/** Parse USD price text like "$2,490.00 " → 2490 */
export function lkxoxPriceToDecimal(text: string | null | undefined): number | null {
  const raw = String(text ?? '').trim()
  if (!raw) return null
  const cleaned = raw.replace(/[^0-9.,]/g, '').replace(/,/g, '')
  const value = parseFloat(cleaned)
  if (!Number.isFinite(value) || value < 0) return null
  return value
}
