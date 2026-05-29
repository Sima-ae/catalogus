'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar, { SidebarMenuButton, useShopSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import ProductCard from '@/components/shop/ProductCard'
import BrandFilter from '@/components/shop/BrandFilter'
import CategoryFilter from '@/components/shop/CategoryFilter'
import { Product } from '@/lib/types'
import { useTheme } from '@/lib/theme'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { appPath } from '@/lib/paths'
import { useShopBrand } from '@/lib/use-shop-brand'
import { useShopCategory } from '@/lib/use-shop-category'
import { APP_NAME } from '@/lib/brand'
import CatalogProductCount from '@/components/shop/CatalogProductCount'
import {
  SparklesIcon,
  FireIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import {
  type CatalogMode,
  filterByBrand,
  filterByCategory,
  filterBySearch,
  sortProducts,
} from '@/lib/catalog'

const EMPTY_ICONS = {
  sparkles: SparklesIcon,
  fire: FireIcon,
  bag: ShoppingBagIcon,
}

export type ShopCatalogConfig = {
  mode: CatalogMode
  title: string
  subtitle: string
  icon: 'sparkles' | 'fire' | 'bag'
  emptyTitle: string
  emptyMessage: string
}

function ShopCatalogPageContent({ config }: { config: ShopCatalogConfig }) {
  const [products, setProducts] = useState<Product[]>([])
  const { selectedCategory, setSelectedCategory } = useShopCategory()
  const { selectedBrand, setSelectedBrand } = useShopBrand()
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const { open: sidebarOpen, openSidebar, closeSidebar } = useShopSidebar()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(appPath('/api/products'), { method: 'GET' })
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      if (!Array.isArray(data)) throw new Error('Invalid data format returned')
      setProducts(data)
    } catch (err) {
      setError(`Failed to load products: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const sortedProducts = useMemo(
    () => sortProducts(products, config.mode),
    [products, config.mode]
  )

  const displayedProducts = useMemo(() => {
    let list = filterByCategory(sortedProducts, selectedCategory)
    if (selectedCategory !== 'All') {
      list = filterByBrand(list, selectedBrand)
    }
    list = filterBySearch(list, searchQuery)
    return list
  }, [sortedProducts, selectedCategory, selectedBrand, searchQuery])

  const isDark = theme === 'dark'
  const EmptyIcon = EMPTY_ICONS[config.icon]
  const shellBg = isDark ? 'bg-dark-950' : 'bg-gray-50'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${shellBg} overflow-x-hidden`}>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 flex flex-col min-w-0">
        <AppStickyHeader
          title={config.title}
          showSocialProof
          searchPlaceholder={`Search in ${config.title.toLowerCase()}...`}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          leading={<SidebarMenuButton open={sidebarOpen} onOpen={openSidebar} />}
          actions={<ShopHeroHeaderActions />}
        />

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden app-readable ${shellBg}`}>
          <CategoryFilter selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
          <BrandFilter
            selectedCategory={selectedCategory}
            selectedBrand={selectedBrand}
            onBrandChange={setSelectedBrand}
          />

          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
              <p className={muted}>Loading {config.title.toLowerCase()}...</p>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-red-500 mb-4">{error}</p>
              <button type="button" onClick={fetchProducts} className="btn-primary px-6 py-2">
                Try Again
              </button>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className={`text-center py-16 rounded-xl border ${isDark ? 'border-dark-800 bg-dark-900' : 'border-gray-200 bg-white'}`}>
              <EmptyIcon className={`w-12 h-12 mx-auto mb-4 ${muted}`} />
              <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {config.emptyTitle}
              </h2>
              <p className={`${muted} mb-6 max-w-md mx-auto`}>{config.emptyMessage}</p>
              <Link href={appPath('/')} className="btn-primary inline-flex px-6 py-2">
                Browse all products
              </Link>
            </div>
          ) : (
            <>
              <CatalogProductCount count={displayedProducts.length} />
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          )}

          <p className={`mt-10 text-center text-xs ${muted}`}>
            {APP_NAME} — curated digital products for professionals
          </p>
        </main>
      </div>
    </div>
  )
}

export default function ShopCatalogPage({ config }: { config: ShopCatalogConfig }) {
  return (
    <Suspense fallback={null}>
      <ShopCatalogPageContent config={config} />
    </Suspense>
  )
}
