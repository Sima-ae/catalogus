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

  const wrapperClass = centered
    ? 'mt-2 flex w-full min-w-0 justify-center'
    : 'mt-4 w-full min-w-0'

  if (loading && brands.length <= 1) {
    return (
      <div className={wrapperClass} aria-busy="true" aria-label="Loading brands">
        <FilterPillsSkeleton centered={centered} />
      </div>
    )
  }

  if (brands.length <= 1) return null

  return (
    <div className={wrapperClass}>
      <FilterPillsScroll
        items={brands}
        selected={selectedBrand}
        onChange={onBrandChange}
        showArrows={brands.length > 5}
        ariaLabel="Brands"
        centered={centered}
      />
    </div>
  )
}
