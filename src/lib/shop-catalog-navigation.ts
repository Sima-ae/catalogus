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
  return fromNav.length > 0
}
