'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import { useShopSubcategory } from '@/lib/use-shop-subcategory'
import { useI18n } from '@/lib/i18n-context'
import { getTopCategoryLabel } from '@/lib/i18n-categories'

interface SubcategoryFilterProps {
  selectedCategory: string
  centered?: boolean
}

export default function SubcategoryFilter({
  selectedCategory,
  centered = false,
}: SubcategoryFilterProps) {
  const { t } = useI18n()
  const { selectedSubcategory, setSelectedSubcategory, subcategoryOptions, hasSubcategories, loadingSubcategories } =
    useShopSubcategory(selectedCategory)

  if (loadingSubcategories || !hasSubcategories || selectedCategory === 'All') return null

  const items = ['All', ...subcategoryOptions]

  return (
    <div
      className={
        centered ? 'mt-2 flex w-full min-w-0 justify-center' : 'mt-3 w-full min-w-0'
      }
    >
      <FilterPillsScroll
        items={items}
        selected={selectedSubcategory}
        onChange={setSelectedSubcategory}
        showArrows={subcategoryOptions.length > 6}
        ariaLabel="Subcategories"
        centered={centered}
        getLabel={(value) => getTopCategoryLabel(value, t, { allStyle: 'all' })}
      />
    </div>
  )
}
