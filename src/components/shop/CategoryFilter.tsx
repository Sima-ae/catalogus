'use client'

import FilterPillsScroll from '@/components/shop/FilterPillsScroll'
import { useShopCategoryList } from '@/lib/use-shop-category-list'

interface CategoryFilterProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  centered?: boolean
}

export default function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  centered = false,
}: CategoryFilterProps) {
  const categories = useShopCategoryList()

  return (
    <div className={centered ? 'flex w-full justify-center' : undefined}>
      <FilterPillsScroll
        items={categories}
        selected={selectedCategory}
        onChange={onCategoryChange}
        showArrows={false}
        ariaLabel="Categories"
        centered={centered}
        alignGroup={centered ? 'center' : 'full'}
      />
    </div>
  )
}
