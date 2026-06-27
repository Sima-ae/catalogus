export type BrandRow = {
  name?: string
  active?: boolean | number
}

export type ShopBrandFilterContext = {
  selectedCategory: string
  selectedSubcategory: string
  selectedNestedSubcategory?: string
  hasSubcategories: boolean
  hasNestedSubcategories?: boolean
  loadingSubcategories: boolean
  loadingNestedSubcategories?: boolean
}

/** Show brand pills when a leaf filter is selected or no deeper pills remain. */
export function shouldShowShopBrandFilter(ctx: ShopBrandFilterContext): boolean {
  if (!ctx.selectedCategory || ctx.selectedCategory === 'All') return false
  if (ctx.selectedNestedSubcategory && ctx.selectedNestedSubcategory !== 'All') return true
  if (ctx.selectedSubcategory !== 'All') {
    if (ctx.loadingNestedSubcategories) return false
    return !ctx.hasNestedSubcategories
  }
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

/** Apply ?brand= from the URL even when category pills are not active (e.g. product page links). */
export function shouldPassBrandToCatalogQuery(brand: string): boolean {
  const trimmed = brand.trim()
  return Boolean(trimmed && trimmed !== 'All')
}

export function findShopBrandInMenu(brand: string, menu: string[]): string | undefined {
  const needle = brand.trim().toLowerCase()
  if (!needle) return undefined
  return menu.find((name) => name.toLowerCase() === needle)
}

/** Build shop filter menu: active brand names only (no "All" pill — absence of ?brand= means all brands). */
export function buildShopBrandMenu(rows: BrandRow[]): string[] {
  const names = rows
    .filter((row) => row.active !== false && row.active !== 0)
    .map((row) => String(row.name || '').trim())
    .filter(Boolean)

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
}
