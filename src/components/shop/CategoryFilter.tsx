'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import { useShopCategoryList } from '@/lib/use-shop-category-list'
import { useI18n } from '@/lib/i18n-context'
import { getTopCategoryLabel } from '@/lib/i18n-categories'

interface CategoryFilterProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  centered?: boolean
}

export default function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  centered = false,
}: CategoryFilterProps) {
  const categories = useShopCategoryList()
  const { t } = useI18n()

  return (
    <div className={centered ? 'flex w-full min-w-0 justify-center' : undefined}>
      <FilterPillsScroll
        items={categories}
        selected={selectedCategory}
        onChange={onCategoryChange}
        showArrows={categories.length > 5}
        ariaLabel="Categories"
        centered={centered}
        getLabel={(value) => getTopCategoryLabel(value, t, { allStyle: 'all' })}
      />
    </div>
  )
}
