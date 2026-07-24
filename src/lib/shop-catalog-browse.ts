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

/** Hold product queries only while subcategory menus are still resolving. */
export function shouldDeferShopCatalogProductLoad(
  state: ShopCatalogBrowseDeferState
): boolean {
  if (state.searchActive) return false
  // Do not block on needsSubcategoryPick / needsNestedSubcategoryPick — selecting a
  // parent category (PERFUMES, CLOTHES, …) should list all products immediately; pills
  // remain optional filters (All / specific).
  return state.loadingSubcategories || state.loadingNestedSubcategories
}
