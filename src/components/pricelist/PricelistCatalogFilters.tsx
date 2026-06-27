'use client'

import { useMemo } from 'react'
import CategoryFilter from '@/components/shop/CategoryFilter'
import SubcategoryFilter from '@/components/shop/SubcategoryFilter'
import BrandFilter from '@/components/shop/BrandFilter'
import { useShopCategory } from '@/lib/use-shop-category'
import { useShopBrand } from '@/lib/use-shop-brand'
import {
  useShopNestedSubcategory,
  useShopSubcategory,
} from '@/lib/use-shop-subcategory'

/** Shop-style category / subcategory / nested / brand pills for the pricelist page. */
export default function PricelistCatalogFilters() {
  const { selectedCategory, setSelectedCategory } = useShopCategory()
  const subcategoryState = useShopSubcategory(selectedCategory)
  const { selectedSubcategory } = subcategoryState
  const nestedSubcategoryState = useShopNestedSubcategory(
    selectedCategory,
    selectedSubcategory
  )
  const { selectedBrand, setSelectedBrand } = useShopBrand({
    selectedCategory,
    subcategoryState,
    nestedSubcategoryState,
  })

  const nestedPillState = useMemo(
    () => ({
      selectedSubcategory: nestedSubcategoryState.selectedNestedSubcategory,
      setSelectedSubcategory: nestedSubcategoryState.setSelectedNestedSubcategory,
      subcategoryOptions: nestedSubcategoryState.nestedSubcategoryOptions,
      hasSubcategories: nestedSubcategoryState.hasNestedSubcategories,
      loadingSubcategories: nestedSubcategoryState.loadingNestedSubcategories,
    }),
    [nestedSubcategoryState]
  )

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
      <SubcategoryFilter
        selectedCategory={selectedSubcategory}
        centered
        subcategoryState={nestedPillState}
        ariaLabel="Nested subcategories"
      />
      <BrandFilter
        selectedCategory={selectedCategory}
        selectedBrand={selectedBrand}
        onBrandChange={setSelectedBrand}
        centered
        subcategoryState={subcategoryState}
        nestedSubcategoryState={nestedSubcategoryState}
      />
    </div>
  )
}
