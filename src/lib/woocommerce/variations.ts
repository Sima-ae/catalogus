import type { ProductOptionGroup, ProductOptions } from '@/lib/product-options'
import type { WooCommercePriceMode, WooStoreProduct } from '@/lib/woocommerce/types'
import { wooPriceToDecimal } from '@/lib/woocommerce/types'
import { listWooStoreVariations } from '@/lib/woocommerce/client'

function slugifyOption(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseWooVariationParts(variation: string | null | undefined): {
  group: string
  value: string
} | null {
  const raw = String(variation ?? '').trim()
  const idx = raw.indexOf(':')
  if (idx <= 0) return null
  const group = raw.slice(0, idx).trim()
  const value = raw.slice(idx + 1).trim()
  if (!group || !value) return null
  return { group, value }
}

function variationAttributeGroups(product: WooStoreProduct): Map<string, { name: string; slug?: string }> {
  const map = new Map<string, { name: string; slug?: string }>()
  for (const attr of product.attributes ?? []) {
    if (!attr.has_variations) continue
    const name = String(attr.name ?? '').trim()
    if (!name) continue
    const slug =
      attr.taxonomy?.replace(/^pa_/, '').trim() ||
      slugifyOption(name)
    map.set(name.toLowerCase(), { name, slug })
  }
  return map
}

/** Map WooCommerce variation rows to catalog product_options JSON. */
export function mapWooVariationsToProductOptions(
  product: WooStoreProduct,
  variations: WooStoreProduct[],
  priceMode: WooCommercePriceMode = 'storefront'
): ProductOptions | null {
  if (!variations.length) return null

  const usePurchasePrice = priceMode === 'purchase_price'
  const attrGroups = variationAttributeGroups(product)
  const grouped = new Map<string, ProductOptionGroup>()

  for (const variation of variations) {
    const parts = parseWooVariationParts(variation.variation)
    if (!parts) continue

    const meta = attrGroups.get(parts.group.toLowerCase()) ?? {
      name: parts.group,
      slug: slugifyOption(parts.group),
    }
    const { price, originalPrice } = wooPriceToDecimal(variation.prices)
    if (price <= 0 && !usePurchasePrice) continue

    const value = {
      label: parts.value,
      slug: slugifyOption(parts.value),
      price: usePurchasePrice ? price : price,
      original_price: usePurchasePrice ? null : originalPrice,
      ...(usePurchasePrice && price > 0 ? { purchase_price: price } : {}),
    }

    const key = meta.name
    const existing = grouped.get(key)
    if (existing) {
      if (!existing.values.some((v) => v.label === value.label)) {
        existing.values.push(value)
      }
    } else {
      grouped.set(key, {
        name: meta.name,
        slug: meta.slug,
        values: [value],
      })
    }
  }

  const options = Array.from(grouped.values())
    .map((group) => ({
      ...group,
      values: [...group.values].sort((a, b) => a.price - b.price || a.label.localeCompare(b.label)),
    }))
    .filter((g) => g.values.length > 0)

  return options.length ? options : null
}

export async function fetchWooProductOptions(
  storeUrl: string,
  product: WooStoreProduct,
  priceMode: WooCommercePriceMode = 'storefront'
): Promise<ProductOptions | null> {
  if (String(product.type ?? '').toLowerCase() !== 'variable') return null
  const variations = await listWooStoreVariations(storeUrl, product.id)
  return mapWooVariationsToProductOptions(product, variations, priceMode)
}
