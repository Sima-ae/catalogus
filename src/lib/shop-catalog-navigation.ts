import {
  getCachedShopCategoryNavSync,
  resolveShopSubcategoriesFromNav,
} from '@/lib/shop-categories-client'

/** True when the category shows subcategory pills before products should load. */
export function categoryHasBrowseChildren(categoryName: string): boolean {
  if (!categoryName || categoryName === 'All') return false

  const fromNav = resolveShopSubcategoriesFromNav(
    getCachedShopCategoryNavSync(),
    categoryName
  )
  // Match subcategory pills: zero-count children (e.g. empty "- BOX -" under WATCHES) do not defer.
  return fromNav.some((child) => (child.productCount ?? 0) > 0)
}
