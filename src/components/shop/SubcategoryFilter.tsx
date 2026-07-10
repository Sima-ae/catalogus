'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import type { ShopSubcategoryHookValue } from '@/lib/use-shop-subcategory'
import { useI18n } from '@/lib/i18n-context'
import { getTopCategoryLabel } from '@/lib/i18n-categories'
import { useTheme } from '@/lib/theme'

interface SubcategoryFilterProps {
  selectedCategory: string
  centered?: boolean
  displaySubcategory?: string
  onSubcategoryChange?: (subcategory: string) => void
  onSubcategoryHover?: (subcategory: string) => void
  subcategoryState: ShopSubcategoryHookValue
  ariaLabel?: string
}

function SubcategoryFilterSkeleton({
  centered,
  isDark,
}: {
  centered: boolean
  isDark: boolean
}) {
  const pillClass = isDark ? 'bg-dark-800' : 'bg-gray-200'
  return (
    <div
      className={
        centered
          ? 'mt-2 flex w-full min-w-0 justify-center'
          : 'mt-3 w-full min-w-0'
      }
      aria-hidden
    >
      <div className="flex max-w-full gap-2 overflow-hidden px-1">
        {[112, 96, 120, 88, 104].map((width, index) => (
          <div
            key={index}
            className={`h-9 shrink-0 animate-pulse rounded-full ${pillClass}`}
            style={{ width }}
          />
        ))}
      </div>
    </div>
  )
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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const {
    selectedSubcategory,
    setSelectedSubcategory,
    subcategoryOptions,
    hasSubcategories,
    loadingSubcategories,
  } = subcategoryState

  if (selectedCategory === 'All') return null

  if (loadingSubcategories) {
    return <SubcategoryFilterSkeleton centered={centered} isDark={isDark} />
  }

  if (!hasSubcategories) return null

  const shown = displaySubcategory ?? selectedSubcategory
  const onChange = onSubcategoryChange ?? setSelectedSubcategory
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
