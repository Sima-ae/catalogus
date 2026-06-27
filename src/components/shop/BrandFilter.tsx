'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import FilterPillsSkeleton from '@/components/shop/FilterPillsSkeleton'
import { useShopBrandList } from '@/lib/use-shop-brand-list'
import { shouldShowShopBrandFilter } from '@/lib/shop-brand-menu'
import type { ShopSubcategoryHookValue } from '@/lib/use-shop-subcategory'

interface BrandFilterProps {
  selectedCategory: string
  selectedBrand: string
  onBrandChange: (brand: string) => void
  centered?: boolean
  displayBrand?: string
  onBrandHover?: (brand: string) => void
  subcategoryState: Pick<
    ShopSubcategoryHookValue,
    'selectedSubcategory' | 'hasSubcategories' | 'loadingSubcategories'
  >
}

export default function BrandFilter({
  selectedCategory,
  selectedBrand,
  onBrandChange,
  centered = false,
  displayBrand,
  onBrandHover,
  subcategoryState,
}: BrandFilterProps) {
  const {
    selectedSubcategory,
    hasSubcategories,
    loadingSubcategories,
  } = subcategoryState

  const showBrandRow = shouldShowShopBrandFilter({
    selectedCategory,
    selectedSubcategory,
    hasSubcategories,
    loadingSubcategories,
  })

  const { brands, loading } = useShopBrandList(
    selectedCategory,
    selectedSubcategory,
    showBrandRow
  )

  if (!showBrandRow) return null

  const brandOptions = brands.filter((name) => name !== 'All')
  const shownBrand = displayBrand ?? selectedBrand

  const wrapperClass = centered
    ? 'mt-2 flex w-full min-w-0 justify-center'
    : 'mt-4 w-full min-w-0'

  if (loading && brandOptions.length === 0) {
    return (
      <div className={wrapperClass} aria-busy="true" aria-label="Loading brands">
        <FilterPillsSkeleton centered={centered} />
      </div>
    )
  }

  if (brandOptions.length === 0) return null

  return (
    <div className={wrapperClass}>
      <FilterPillsScroll
        items={brandOptions}
        selected={shownBrand === 'All' ? '' : shownBrand}
        onChange={onBrandChange}
        onItemHover={onBrandHover}
        showArrows={brands.length > 5}
        ariaLabel="Brands"
        centered={centered}
      />
    </div>
  )
}
