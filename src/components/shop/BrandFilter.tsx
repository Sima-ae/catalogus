'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import FilterPillsSkeleton from '@/components/shop/FilterPillsSkeleton'
import { useShopBrandList } from '@/lib/use-shop-brand-list'

interface BrandFilterProps {
  selectedCategory: string
  selectedSubcategory?: string
  selectedBrand: string
  onBrandChange: (brand: string) => void
  centered?: boolean
}

export default function BrandFilter({
  selectedCategory,
  selectedSubcategory = 'All',
  selectedBrand,
  onBrandChange,
  centered = false,
}: BrandFilterProps) {
  const { brands, loading } = useShopBrandList(selectedCategory, selectedSubcategory)

  if (selectedCategory === 'All') return null

  const brandOptions = brands.filter((name) => name !== 'All')

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
        selected={selectedBrand === 'All' ? '' : selectedBrand}
        onChange={onBrandChange}
        showArrows={brands.length > 5}
        ariaLabel="Brands"
        centered={centered}
      />
    </div>
  )
}
