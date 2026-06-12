import type { ProductInput } from '@/lib/products-db'
import {
  minOptionPurchasePrice,
  type ProductOptionGroup,
  type ProductOptions,
  type ProductOptionValue,
} from '@/lib/product-options'

export type RefreshPricingSnapshot = {
  price: number
  original_price?: number | null
  purchase_price?: number | null
  product_options?: ProductOptions | null
}

function optionTierKey(groupName: string, label: string): string {
  return `${groupName}\0${label}`
}

function normalizeMoney(value: number | null | undefined): number | null {
  if (value == null) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Keep admin sales prices when refresh would overwrite them with 0 / empty. */
function preserveSalesPrice(existing: number, incoming: number): number {
  if (incoming > 0) return incoming
  if (existing > 0) return existing
  return incoming
}

/** Update purchase cost only when the supplier value actually changed. */
function mergePurchasePrice(
  existing: number | null | undefined,
  incoming: number | null | undefined
): number | null | undefined {
  const inc = normalizeMoney(incoming)
  if (inc == null) return existing
  const ex = normalizeMoney(existing)
  if (ex != null && ex === inc) return ex
  return inc
}

function preserveSalesOriginal(
  existing: RefreshPricingSnapshot,
  incoming: Pick<ProductInput, 'original_price' | 'price'>,
  resolvedPrice: number
): number | null | undefined {
  const keptExistingSalesPrice =
    resolvedPrice === existing.price && existing.price > 0 && !(Number(incoming.price) > 0)
  if (!keptExistingSalesPrice) {
    return incoming.original_price ?? null
  }
  const incomingOriginal = normalizeMoney(incoming.original_price)
  if (incomingOriginal != null && incomingOriginal > 0) return incomingOriginal
  return existing.original_price ?? null
}

function mergeOptionTierPricing(
  existing: ProductOptionValue | undefined,
  incoming: ProductOptionValue
): ProductOptionValue {
  if (!existing) return incoming

  const price = preserveSalesPrice(existing.price, incoming.price)
  const keptExistingSalesPrice = price === existing.price && existing.price > 0 && !(incoming.price > 0)
  const incomingOriginal = normalizeMoney(incoming.original_price)
  const original_price = keptExistingSalesPrice
    ? incomingOriginal != null && incomingOriginal > 0
      ? incomingOriginal
      : existing.original_price ?? null
    : incoming.original_price ?? null

  const purchase_price = mergePurchasePrice(existing.purchase_price, incoming.purchase_price)

  return {
    ...incoming,
    price,
    original_price,
    ...(purchase_price !== undefined ? { purchase_price } : {}),
  }
}

function mergeProductOptions(
  existing: ProductOptions | null | undefined,
  incoming: ProductOptions | null | undefined
): ProductOptions | null | undefined {
  if (!incoming?.length) return incoming ?? existing ?? undefined
  if (!existing?.length) return incoming

  const existingByKey = new Map<string, ProductOptionValue>()
  for (const group of existing) {
    for (const value of group.values) {
      existingByKey.set(optionTierKey(group.name, value.label), value)
    }
  }

  const merged: ProductOptionGroup[] = incoming.map((group) => ({
    ...group,
    values: group.values.map((value) =>
      mergeOptionTierPricing(existingByKey.get(optionTierKey(group.name, value.label)), value)
    ),
  }))

  return merged
}

/**
 * On --refresh import, preserve manually entered sales prices and only update purchase
 * costs when the supplier price changed. Prevents AR Factory re-sync from wiping margins.
 */
export function mergeRefreshProductPricing(
  existing: RefreshPricingSnapshot,
  incoming: Pick<
    ProductInput,
    'price' | 'original_price' | 'purchase_price' | 'product_options'
  >
): Pick<ProductInput, 'price' | 'original_price' | 'purchase_price' | 'product_options'> {
  const product_options = mergeProductOptions(existing.product_options, incoming.product_options)

  const price = preserveSalesPrice(Number(existing.price) || 0, Number(incoming.price) || 0)
  const original_price = preserveSalesOriginal(existing, incoming, price)

  const purchase_price = product_options?.length
    ? minOptionPurchasePrice(product_options) ??
      mergePurchasePrice(existing.purchase_price, incoming.purchase_price)
    : mergePurchasePrice(existing.purchase_price, incoming.purchase_price)

  return {
    price,
    original_price,
    purchase_price,
    product_options,
  }
}
