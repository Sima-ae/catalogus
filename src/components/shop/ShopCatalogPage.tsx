'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar, { SidebarMenuButton, useShopSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import BrandFilter from '@/components/shop/BrandFilter'
import CategoryFilter from '@/components/shop/CategoryFilter'
import ShopCatalogListing, {
  CATALOG_PAGE_SIZE,
} from '@/components/shop/ShopCatalogListing'
import { Product } from '@/lib/types'
import { useTheme } from '@/lib/theme'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { appPath } from '@/lib/paths'
import { useShopBrand } from '@/lib/use-shop-brand'
import { useShopCategory } from '@/lib/use-shop-category'
import { APP_NAME } from '@/lib/brand'
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
  subtitle?: string
  searchPlaceholder?: string
  showSocialProof?: boolean
  showFooterTagline?: boolean
  /** Simple text empty state (homepage) vs icon card (/new). */
  emptyVariant?: 'simple' | 'featured'
  icon?: 'sparkles' | 'fire' | 'bag'
  emptyTitle?: string
  emptyMessage?: string
  /** Center category pills, count, and pagination (homepage). */
  centerCatalog?: boolean
}

function ShopCatalogPageContent({ config }: { config: ShopCatalogConfig }) {
  const [products, setProducts] = useState<Product[]>([])
  const { selectedCategory, setSelectedCategory } = useShopCategory()
  const { selectedBrand, setSelectedBrand } = useShopBrand()
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const { theme } = useTheme()
  const {
    open: sidebarOpen,
    openSidebar,
    closeSidebar,
    dismissSidebarManually,
    asideRef,
  } = useShopSidebar()

  const searchPlaceholder =
    config.searchPlaceholder ?? `Search in ${config.title.toLowerCase()}...`
  const emptyVariant = config.emptyVariant ?? 'featured'
  const showSocialProof = config.showSocialProof ?? true
  const showFooterTagline = config.showFooterTagline ?? config.mode === 'new'

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
    return filterBySearch(list, searchQuery)
  }, [sortedProducts, selectedCategory, selectedBrand, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, selectedBrand, searchQuery, config.mode])

  const totalPages = Math.max(
    1,
    Math.ceil(displayedProducts.length / CATALOG_PAGE_SIZE) || 1
  )
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  useEffect(() => {
    if (currentPage !== safePage) setCurrentPage(safePage)
  }, [currentPage, safePage])

  const isDark = theme === 'dark'
  const EmptyIcon = config.icon ? EMPTY_ICONS[config.icon] : SparklesIcon
  const shellBg = isDark ? 'bg-dark-950' : 'bg-gray-50'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${shellBg} overflow-x-hidden`}>
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        onManualClose={dismissSidebarManually}
        asideRef={asideRef}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AppStickyHeader
          title={config.title}
          showSocialProof={showSocialProof}
          searchPlaceholder={searchPlaceholder}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          leading={<SidebarMenuButton open={sidebarOpen} onOpen={openSidebar} />}
          actions={<ShopHeroHeaderActions />}
        />

        <main
          className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-colors duration-200 app-readable ${shellBg}`}
        >
          <div className="max-w-full">
            <div
              className={
                config.centerCatalog ? 'mb-5 flex w-full flex-col gap-2' : undefined
              }
            >
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                centered={config.centerCatalog}
              />
              <BrandFilter
                selectedCategory={selectedCategory}
                selectedBrand={selectedBrand}
                onBrandChange={setSelectedBrand}
                centered={config.centerCatalog}
              />
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
                <p className={`text-lg ${muted}`}>Loading products...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <svg
                    className="w-16 h-16 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3
                  className={`text-xl font-semibold mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Failed to Load Products
                </h3>
                <p className={`text-lg mb-4 ${muted}`}>{error}</p>
                <button type="button" onClick={fetchProducts} className="btn-primary px-6 py-2">
                  Try Again
                </button>
              </div>
            ) : displayedProducts.length === 0 ? (
              emptyVariant === 'simple' ? (
                <div className="text-center py-12">
                  <p className={`text-lg ${muted}`}>
                    {searchQuery.trim()
                      ? 'No products match your search.'
                      : 'No products found in this category.'}
                  </p>
                </div>
              ) : (
                <div
                  className={`text-center py-16 rounded-xl border ${
                    isDark ? 'border-dark-800 bg-dark-900' : 'border-gray-200 bg-white'
                  }`}
                >
                  <EmptyIcon className={`w-12 h-12 mx-auto mb-4 ${muted}`} />
                  <h2
                    className={`text-xl font-semibold mb-2 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {config.emptyTitle ?? 'No products'}
                  </h2>
                  <p className={`${muted} mb-6 max-w-md mx-auto`}>
                    {config.emptyMessage ?? 'Try another category or search.'}
                  </p>
                  <Link href={appPath('/')} className="btn-primary inline-flex px-6 py-2">
                    Browse all products
                  </Link>
                </div>
              )
            ) : (
              <ShopCatalogListing
                products={displayedProducts}
                page={safePage}
                onPageChange={setCurrentPage}
                centered={config.centerCatalog}
              />
            )}
          </div>

          {showFooterTagline ? (
            <p className={`mt-10 text-center text-xs ${muted}`}>
              {APP_NAME} — curated digital products for professionals
            </p>
          ) : null}
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
