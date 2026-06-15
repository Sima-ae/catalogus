import { load } from 'cheerio'
import { cleanProductGalleryUrls } from '@/lib/product-image-url'
import type {
  WooStoreAttribute,
  WooStoreImage,
  WooStoreProduct,
  WooProductData,
} from '@/lib/woocommerce/types'
import {
  decodeWooHtmlEntities,
  wooExternalId,
  wooPriceToDecimal,
} from '@/lib/woocommerce/types'

export function stripWooHtml(html: string | null | undefined): string {
  const raw = String(html ?? '').trim()
  if (!raw) return ''
  const $ = load(raw)
  return $.text().replace(/\s+/g, ' ').trim()
}

function attributeTermNames(attr: WooStoreAttribute): string {
  return (attr.terms ?? [])
    .map((term) => String(term.name ?? '').trim())
    .filter(Boolean)
    .join(', ')
}

export function wooBrandFromAttributes(
  attributes: WooStoreAttribute[] | null | undefined
): string | null {
  if (!attributes?.length) return null
  const brandAttr = attributes.find((attr) => {
    const name = String(attr.name ?? '').trim().toLowerCase()
    const taxonomy = String(attr.taxonomy ?? '').trim().toLowerCase()
    return name === 'brand' || taxonomy === 'pa_brand'
  })
  const value = brandAttr ? attributeTermNames(brandAttr) : ''
  return value || null
}

export function wooDescriptionFromAttributes(
  attributes: WooStoreAttribute[] | null | undefined
): string {
  if (!attributes?.length) return ''
  const lines: string[] = []
  for (const attr of attributes) {
    const label = String(attr.name ?? '').trim()
    const value = attributeTermNames(attr)
    if (!label || !value) continue
    lines.push(`${label}: ${value}`)
  }
  return lines.join('\n')
}

function wooCategoryNameFromProduct(product: WooStoreProduct): string | null {
  const categories = product.categories ?? []
  if (!categories.length) return null
  if (categories.length === 1) {
    return String(categories[0].name ?? '').trim() || null
  }
  const sorted = [...categories].sort((a, b) => {
    const lenA = String(a.link ?? '').split('/').filter(Boolean).length
    const lenB = String(b.link ?? '').split('/').filter(Boolean).length
    return lenA - lenB
  })
  return String(sorted[0].name ?? '').trim() || null
}

/** Strip WooCommerce thumbnail size suffixes so we mirror full-resolution files. */
export function upgradeWooCommerceStoreImageUrl(url: string): string {
  const raw = String(url ?? '').trim().split('?')[0]
  if (!raw) return ''
  return raw.replace(/-\d+x\d+(?=\.(jpe?g|png|webp|gif)$)/i, '')
}

export function wooImageUrlFromStoreImage(img: WooStoreImage): string {
  const src = upgradeWooCommerceStoreImageUrl(String(img.src ?? '').trim())
  if (src) return src
  return upgradeWooCommerceStoreImageUrl(String(img.thumbnail ?? '').trim())
}

/** Parent gallery + variation images, deduped (order preserved). */
export function collectWooProductImageUrls(
  product: WooStoreProduct,
  variations: WooStoreProduct[] = []
): string[] {
  const urls: string[] = []
  for (const img of product.images ?? []) {
    const url = wooImageUrlFromStoreImage(img)
    if (url) urls.push(url)
  }
  for (const variation of variations) {
    for (const img of variation.images ?? []) {
      const url = wooImageUrlFromStoreImage(img)
      if (url) urls.push(url)
    }
  }
  return cleanProductGalleryUrls(urls)
}

export function mapWooStoreProduct(product: WooStoreProduct): WooProductData {
  const { price, originalPrice } = wooPriceToDecimal(product.prices)
  const attributes = product.attributes ?? []
  const brandName =
    product.brands?.[0]?.name?.trim() || wooBrandFromAttributes(attributes) || null
  const categoryName = wooCategoryNameFromProduct(product)
  const imageUrls = collectWooProductImageUrls(product)

  const sku = String(product.sku ?? '').trim() || wooExternalId(product.id)

  const htmlDescription = stripWooHtml(product.description)
  const htmlShort = stripWooHtml(product.short_description)
  const description =
    htmlDescription || htmlShort || wooDescriptionFromAttributes(attributes)

  return {
    productId: product.id,
    externalId: wooExternalId(product.id),
    name: decodeWooHtmlEntities(String(product.name ?? '').trim()),
    sku,
    permalink: String(product.permalink ?? '').trim(),
    description,
    shortDescription: htmlShort || htmlDescription,
    price,
    originalPrice,
    currency: String(product.prices?.currency_code ?? 'EUR').trim() || 'EUR',
    imageUrls,
    brandName,
    categoryName,
  }
}
