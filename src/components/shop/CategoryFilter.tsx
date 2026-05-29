'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import { useShopCategoryList } from '@/lib/use-shop-category-list'

interface CategoryFilterProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

export default function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
  const categories = useShopCategoryList()

  return (
    <FilterPillsScroll
      items={categories}
      selected={selectedCategory}
      onChange={onCategoryChange}
      showArrows={false}
      ariaLabel="Categories"
    />
  )
}
