export type ProductOptionValue = {
  label: string
  slug?: string
  price: number
  original_price?: number | null
  purchase_price?: number | null
}

export type ProductOptionGroup = {
  name: string
  slug?: string
  values: ProductOptionValue[]
}

export type ProductOptions = ProductOptionGroup[]

export function parseProductOptions(value: unknown): ProductOptions | null {
  if (value == null || value === '') return null
  let raw: unknown = value
  if (typeof value === 'string') {
    try {
      raw = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!Array.isArray(raw) || !raw.length) return null

  const groups: ProductOptionGroup[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const name = String(rec.name ?? '').trim()
    const slug = rec.slug != null ? String(rec.slug).trim() : undefined
    const valuesRaw = rec.values
    if (!name || !Array.isArray(valuesRaw)) continue

    const values: ProductOptionValue[] = []
    for (const v of valuesRaw) {
      if (!v || typeof v !== 'object') continue
      const vr = v as Record<string, unknown>
      const label = String(vr.label ?? '').trim()
      if (!label) continue
      const price = Number(vr.price)
      if (!Number.isFinite(price) || price < 0) continue
      const original =
        vr.original_price != null && vr.original_price !== ''
          ? Number(vr.original_price)
          : null
      const purchase =
        vr.purchase_price != null && vr.purchase_price !== ''
          ? Number(vr.purchase_price)
          : null
      values.push({
        label,
        slug: vr.slug != null ? String(vr.slug).trim() : undefined,
        price,
        original_price:
          original != null && Number.isFinite(original) && original > 0 ? original : null,
        purchase_price:
          purchase != null && Number.isFinite(purchase) && purchase >= 0 ? purchase : null,
      })
    }
    if (values.length) groups.push({ name, slug, values })
  }

  return groups.length ? groups : null
}

export function productHasOptions(options: ProductOptions | null | undefined): boolean {
  return Boolean(options?.some((g) => g.values.length > 0))
}

export function findOptionValue(
  groups: ProductOptions,
  groupName: string,
  valueLabel: string
): ProductOptionValue | null {
  const group = groups.find((g) => g.name === groupName)
  if (!group) return null
  return group.values.find((v) => v.label === valueLabel) ?? null
}

export function resolveSelectedOptionPrices(
  basePrice: number,
  baseOriginalPrice: number | null | undefined,
  options: ProductOptions | null | undefined,
  selected: Record<string, string>
): { price: number; original_price: number | null } {
  if (!options?.length) {
    return {
      price: basePrice,
      original_price: baseOriginalPrice ?? null,
    }
  }

  if (!allOptionsSelected(options, selected)) {
    return {
      price: basePrice,
      original_price: baseOriginalPrice ?? null,
    }
  }

  let price: number | null = null
  let original_price: number | null = null

  for (const group of options) {
    const label = selected[group.name]?.trim()
    if (!label) continue
    const value = findOptionValue(options, group.name, label)
    if (!value) continue
    price = value.price
    original_price = value.original_price ?? null
  }

  return { price: price ?? basePrice, original_price }
}

export function optionValueLabels(options: ProductOptions | null | undefined): string[] {
  if (!options?.length) return []
  return options.flatMap((g) => g.values.map((v) => v.label))
}

export function optionPriceRange(
  options: ProductOptions | null | undefined
): { min: number; max: number } | null {
  if (!options?.length) return null
  const prices = options.flatMap((g) => g.values.map((v) => v.price)).filter((p) => p > 0)
  if (!prices.length) return null
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

export function allOptionsSelected(
  options: ProductOptions | null | undefined,
  selected: Record<string, string>
): boolean {
  if (!options?.length) return true
  return options.every((g) => Boolean(selected[g.name]?.trim()))
}

/** Remove internal cost fields from option tiers (shop / buyer API responses). */
export function stripProductOptionsInternalPricing(
  options: ProductOptions | null | undefined
): ProductOptions | null {
  if (!options?.length) return options ?? null
  return options.map((group) => ({
    ...group,
    values: group.values.map(({ purchase_price: _purchasePrice, ...value }) => value),
  }))
}

/** Lowest purchase_price across all option tiers (for products.purchase_price sync). */
export function minOptionPurchasePrice(
  options: ProductOptions | null | undefined
): number | null {
  if (!options?.length) return null
  const values = options
    .flatMap((g) => g.values.map((v) => v.purchase_price))
    .filter((p): p is number => p != null && Number.isFinite(p) && p >= 0)
  return values.length ? Math.min(...values) : null
}

/** One option group with a single tier — no selector needed. */
export function isSingleFixedProductOption(
  options: ProductOptions | null | undefined
): boolean {
  return Boolean(options?.length === 1 && options[0].values.length === 1)
}

export function singleFixedProductOptionSelection(
  options: ProductOptions | null | undefined
): Record<string, string> {
  if (!isSingleFixedProductOption(options)) return {}
  const group = options![0]
  return { [group.name]: group.values[0].label }
}

/** Default: auto-select when only one tier; otherwise show "Choose an option" placeholder. */
export function defaultProductOptionSelection(
  options: ProductOptions | null | undefined
): Record<string, string> {
  return singleFixedProductOptionSelection(options)
}
