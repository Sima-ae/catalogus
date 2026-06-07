export type BrandRow = {
  name?: string
  active?: boolean | number
}

export type ShopBrandFilterContext = {
  selectedCategory: string
  selectedSubcategory: string
  hasSubcategories: boolean
  loadingSubcategories: boolean
}

/** Show brand pills only for a specific subcategory, or when the category has no subcategory row. */
export function shouldShowShopBrandFilter(ctx: ShopBrandFilterContext): boolean {
  if (!ctx.selectedCategory || ctx.selectedCategory === 'All') return false
  if (ctx.selectedSubcategory !== 'All') return true
  if (ctx.loadingSubcategories) return false
  return !ctx.hasSubcategories
}

/** Apply ?brand= to product queries only when brand pills would be visible. */
export function shouldApplyShopBrandFilter(
  brand: string,
  ctx: ShopBrandFilterContext
): boolean {
  if (!brand || brand === 'All') return false
  return shouldShowShopBrandFilter(ctx)
}

/** Build shop filter menu: active brand names only (no "All" pill — absence of ?brand= means all brands). */
export function buildShopBrandMenu(rows: BrandRow[]): string[] {
  const names = rows
    .filter((row) => row.active !== false && row.active !== 0)
    .map((row) => String(row.name || '').trim())
    .filter(Boolean)

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
}
