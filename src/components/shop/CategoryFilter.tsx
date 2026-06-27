'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import { useShopCategoryList } from '@/lib/use-shop-category-list'
import { useI18n } from '@/lib/i18n-context'
import { getTopCategoryLabel } from '@/lib/i18n-categories'

interface CategoryFilterProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  centered?: boolean
  /** Instant highlight while URL navigation is in flight. */
  displayCategory?: string
  onCategoryHover?: (category: string) => void
}

export default function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  centered = false,
  displayCategory,
  onCategoryHover,
}: CategoryFilterProps) {
  const categories = useShopCategoryList()
  const { t } = useI18n()
  const shown = displayCategory ?? selectedCategory

  return (
    <div className={centered ? 'flex w-full min-w-0 justify-center' : undefined}>
      <FilterPillsScroll
        items={categories}
        selected={shown}
        onChange={onCategoryChange}
        onItemHover={onCategoryHover}
        showArrows={categories.length > 5}
        ariaLabel="Categories"
        centered={centered}
        getLabel={(value) => getTopCategoryLabel(value, t, { allStyle: 'all' })}
      />
    </div>
  )
}
