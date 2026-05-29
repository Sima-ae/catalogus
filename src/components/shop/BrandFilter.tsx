'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import { useShopBrandList } from '@/lib/use-shop-brand-list'

interface BrandFilterProps {
  selectedCategory: string
  selectedBrand: string
  onBrandChange: (brand: string) => void
}

export default function BrandFilter({
  selectedCategory,
  selectedBrand,
  onBrandChange,
}: BrandFilterProps) {
  const brands = useShopBrandList(selectedCategory)

  if (brands.length <= 1) return null

  return (
    <div className="mt-4">
      <FilterPillsScroll
        items={brands}
        selected={selectedBrand}
        onChange={onBrandChange}
        showArrows
        ariaLabel="Brands"
      />
    </div>
  )
}
