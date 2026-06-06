import { load } from 'cheerio'
import type { WooStoreProduct, WooProductData } from '@/lib/woocommerce/types'
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

export function mapWooStoreProduct(product: WooStoreProduct): WooProductData {
  const { price, originalPrice } = wooPriceToDecimal(product.prices)
  const brandName = product.brands?.[0]?.name?.trim() || null
  const categoryName = product.categories?.[0]?.name?.trim() || null
  const imageUrls = (product.images ?? [])
    .map((img) => String(img.src ?? '').trim())
    .filter(Boolean)

  const sku = String(product.sku ?? '').trim() || wooExternalId(product.id)

  return {
    productId: product.id,
    externalId: wooExternalId(product.id),
    name: decodeWooHtmlEntities(String(product.name ?? '').trim()),
    sku,
    permalink: String(product.permalink ?? '').trim(),
    description: stripWooHtml(product.description),
    shortDescription: stripWooHtml(product.short_description),
    price,
    originalPrice,
    currency: String(product.prices?.currency_code ?? 'EUR').trim() || 'EUR',
    imageUrls,
    brandName,
    categoryName,
  }
}
