import { getDirectChildCategories } from '@/lib/shop-category-tree'
import {
  getCachedShopCategoryNavSync,
  getCachedShopCategoryRowsSync,
  resolveShopSubcategoriesFromNav,
} from '@/lib/shop-categories-client'

/** True when the category shows subcategory pills before products should load. */
export function categoryHasBrowseChildren(categoryName: string): boolean {
  if (!categoryName || categoryName === 'All') return false

  const fromNav = resolveShopSubcategoriesFromNav(
    getCachedShopCategoryNavSync(),
    categoryName
  )
  if (fromNav.length > 0) return true

  return getDirectChildCategories(getCachedShopCategoryRowsSync(), categoryName).length > 0
}
