'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import type { ShopSubcategoryHookValue } from '@/lib/use-shop-subcategory'
import { useI18n } from '@/lib/i18n-context'
import { getTopCategoryLabel } from '@/lib/i18n-categories'

interface SubcategoryFilterProps {
  selectedCategory: string
  centered?: boolean
  displaySubcategory?: string
  onSubcategoryChange?: (subcategory: string) => void
  onSubcategoryHover?: (subcategory: string) => void
  subcategoryState: ShopSubcategoryHookValue
  ariaLabel?: string
}

export default function SubcategoryFilter({
  selectedCategory,
  centered = false,
  displaySubcategory,
  onSubcategoryChange,
  onSubcategoryHover,
  subcategoryState,
  ariaLabel = 'Subcategories',
}: SubcategoryFilterProps) {
  const { t } = useI18n()
  const {
    selectedSubcategory,
    setSelectedSubcategory,
    subcategoryOptions,
    hasSubcategories,
    loadingSubcategories,
  } = subcategoryState

  const shown = displaySubcategory ?? selectedSubcategory
  const onChange = onSubcategoryChange ?? setSelectedSubcategory

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
        selected={shown}
        onChange={onChange}
        onItemHover={onSubcategoryHover}
        showArrows={subcategoryOptions.length > 6}
        ariaLabel={ariaLabel}
        centered={centered}
        getLabel={(value) => getTopCategoryLabel(value, t, { allStyle: 'all' })}
      />
    </div>
  )
}
