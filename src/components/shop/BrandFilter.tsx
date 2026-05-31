'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
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
  const brands = useShopBrandList(selectedCategory, selectedSubcategory)

  if (selectedCategory === 'All' || brands.length <= 1) return null

  return (
    <div className={centered ? 'mt-2 w-full' : 'mt-4'}>
      <FilterPillsScroll
        items={brands}
        selected={selectedBrand}
        onChange={onBrandChange}
        showArrows
        ariaLabel="Brands"
        centered={centered}
      />
    </div>
  )
}
