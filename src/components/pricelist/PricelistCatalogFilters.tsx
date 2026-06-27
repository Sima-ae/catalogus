'use client'

import CategoryFilter from '@/components/shop/CategoryFilter'
import SubcategoryFilter from '@/components/shop/SubcategoryFilter'
import BrandFilter from '@/components/shop/BrandFilter'
import { useShopCategory } from '@/lib/use-shop-category'
import { useShopBrand } from '@/lib/use-shop-brand'
import type { ShopSubcategoryHookValue } from '@/lib/use-shop-subcategory'

type Props = {
  subcategoryState: ShopSubcategoryHookValue
}

/** Shop-style category / subcategory / brand pills for the pricelist page. */
export default function PricelistCatalogFilters({ subcategoryState }: Props) {
  const { selectedCategory, setSelectedCategory } = useShopCategory()
  const { selectedBrand, setSelectedBrand } = useShopBrand({
    selectedCategory,
    subcategoryState,
  })

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <CategoryFilter
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        centered
      />
      <SubcategoryFilter
        selectedCategory={selectedCategory}
        centered
        subcategoryState={subcategoryState}
      />
      <BrandFilter
        selectedCategory={selectedCategory}
        selectedBrand={selectedBrand}
        onBrandChange={setSelectedBrand}
        centered
        subcategoryState={subcategoryState}
      />
    </div>
  )
}
