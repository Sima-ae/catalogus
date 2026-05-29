'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar, { MobileMenuButton } from '@/components/layout/Sidebar'
import ProductCard from '@/components/shop/ProductCard'
import BrandFilter from '@/components/shop/BrandFilter'
import CategoryFilter from '@/components/shop/CategoryFilter'
import { Product } from '@/lib/types'
import { useTheme } from '@/lib/theme'
import ThemeToggleButton from '@/components/theme/ThemeToggleButton'
import ShopCartHeaderButton from '@/components/shop/ShopCartHeaderButton'
import { ShopRegisterHeaderButtons } from '@/components/shop/ShopRegisterLinks'
import { appPath } from '@/lib/paths'
import { useShopBrand } from '@/lib/use-shop-brand'
import { useShopCategory } from '@/lib/use-shop-category'
import { APP_NAME } from '@/lib/brand'
import ShopHeroBanner from '@/components/shop/ShopHeroBanner'
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
  productsAddedThisMonth,
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
  description: string
  badge: string
  icon: 'sparkles' | 'fire' | 'bag'
  emptyTitle: string
  emptyMessage: string
  showHero?: boolean
}

function ShopCatalogPageContent({ config }: { config: ShopCatalogConfig }) {
  const [products, setProducts] = useState<Product[]>([])
  const { selectedCategory, setSelectedCategory } = useShopCategory()
  const { selectedBrand, setSelectedBrand } = useShopBrand()
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const showHero =
    config.showHero !== false && config.mode !== 'new' && config.mode !== 'popular'

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

  const stats = useMemo(() => {
    const active = sortProducts(products, 'all')
    const top = sortProducts(products, 'popular')[0]
    return {
      total: active.length,
      newThisMonth: productsAddedThisMonth(products),
      showing: displayedProducts.length,
      topName: top?.name,
    }
  }, [products, displayedProducts.length])

  const isDark = theme === 'dark'
  const EmptyIcon = EMPTY_ICONS[config.icon]
  const shellBg = isDark ? 'bg-dark-950' : 'bg-gray-50'
  const headerBg = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-200'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${shellBg} overflow-x-hidden`}>
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`border-b px-4 sm:px-6 lg:px-8 py-4 ${headerBg}`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MobileMenuButton onClick={() => setMobileNavOpen(true)} />
              <div className="relative flex-1 max-w-lg min-w-0">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search in ${config.title.toLowerCase()}...`}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    isDark
                      ? 'bg-dark-700 border border-dark-600 text-white placeholder-gray-400'
                      : 'bg-gray-100 border border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center flex-wrap justify-end gap-2 sm:gap-3 shrink-0">
              <ThemeToggleButton />
              <ShopCartHeaderButton
                className={`relative p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-200'
                }`}
              />
              <ShopRegisterHeaderButtons buttonClassName="btn-primary text-sm px-3 py-2 hidden sm:inline-flex" />
            </div>
          </div>
        </header>

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden app-readable ${shellBg}`}>
          {showHero && (
            <ShopHeroBanner
              badge={config.badge}
              title={config.title}
              subtitle={config.subtitle}
              description={config.description}
              icon={config.icon}
              stats={stats}
              trendingLabel={config.mode === 'popular'}
            />
          )}

          {!showHero && (
            <h1 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {config.title}
            </h1>
          )}

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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mt-6">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
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
