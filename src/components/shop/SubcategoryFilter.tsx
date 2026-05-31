'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import { useShopSubcategory } from '@/lib/use-shop-subcategory'

interface SubcategoryFilterProps {
  selectedCategory: string
  centered?: boolean
}

export default function SubcategoryFilter({
  selectedCategory,
  centered = false,
}: SubcategoryFilterProps) {
  const { selectedSubcategory, setSelectedSubcategory, subcategoryOptions, hasSubcategories, loadingSubcategories } =
    useShopSubcategory(selectedCategory)

  if (loadingSubcategories || !hasSubcategories || selectedCategory === 'All') return null

  const items = ['All', ...subcategoryOptions]

  return (
    <div className={centered ? 'mt-2 w-full' : 'mt-3'}>
      <FilterPillsScroll
        items={items}
        selected={selectedSubcategory}
        onChange={setSelectedSubcategory}
        showArrows={subcategoryOptions.length > 6}
        ariaLabel="Subcategories"
        centered={centered}
      />
    </div>
  )
}
