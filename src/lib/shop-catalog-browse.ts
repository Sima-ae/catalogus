/** Empty string = browse filter not chosen yet (subcategory / nested pills). */
export function isShopBrowseFilterPending(value: string): boolean {
  return value.length === 0
}

export function shopSubcategoryForApiQuery(subcategory: string): string | undefined {
  if (isShopBrowseFilterPending(subcategory) || subcategory === 'All') return undefined
  return subcategory
}

export function shopNestedSubcategoryForApiQuery(nested: string): string | undefined {
  if (isShopBrowseFilterPending(nested) || nested === 'All') return undefined
  return nested
}

export type ShopCatalogBrowseDeferState = {
  searchActive: boolean
  loadingSubcategories: boolean
  needsSubcategoryPick: boolean
  loadingNestedSubcategories: boolean
  needsNestedSubcategoryPick: boolean
}

/**
 * Parent categories list immediately with subcategory=All.
 * Subcategory / nested pills resolve in parallel — never block the grid.
 */
export function shouldDeferShopCatalogProductLoad(
  _state: ShopCatalogBrowseDeferState
): boolean {
  return false
}
