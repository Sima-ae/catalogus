'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar, { MobileMenuButton } from '@/components/layout/Sidebar'
import ProductCard from '@/components/shop/ProductCard'
import CategoryFilter from '@/components/shop/CategoryFilter'
import { Product } from '@/lib/types'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import { appPath } from '@/lib/paths'
import { APP_NAME } from '@/lib/brand'
import {
  type CatalogMode,
  filterByCategory,
  filterBySearch,
  productsAddedThisMonth,
  sortProducts,
} from '@/lib/catalog'
import {
  SparklesIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'

export type ShopCatalogConfig = {
  mode: CatalogMode
  title: string
  subtitle: string
  description: string
  badge: string
  icon: 'sparkles' | 'fire' | 'bag'
  emptyTitle: string
  emptyMessage: string
}

const ICONS = {
  sparkles: SparklesIcon,
  fire: FireIcon,
  bag: ShoppingBagIcon,
}

export default function ShopCatalogPage({ config }: { config: ShopCatalogConfig }) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { state: cartState } = useCart()
  const { theme, toggleTheme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const Icon = ICONS[config.icon]

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
    list = filterBySearch(list, searchQuery)
    return list
  }, [sortedProducts, selectedCategory, searchQuery])

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
  const shellBg = isDark ? 'bg-dark-900' : 'bg-gray-50'
  const headerBg = isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const heroBg = isDark
    ? 'bg-gradient-to-br from-dark-800 via-dark-900 to-black border-dark-700'
    : 'bg-gradient-to-br from-gray-100 via-white to-gray-50 border-gray-200'

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
              <button
                type="button"
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'text-gray-400 hover:text-white hover:bg-dark-700' : 'text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>
              <Link
                href={appPath('/cart')}
                className={`relative p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-200'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                {cartState.itemCount > 0 && (
                  <span className="cart-badge">{cartState.itemCount > 99 ? '99+' : cartState.itemCount}</span>
                )}
              </Link>
              <Link href={appPath('/seller')} className="btn-primary text-sm px-3 py-2 hidden sm:inline-flex">
                Become a Seller
              </Link>
            </div>
          </div>
        </header>

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden ${shellBg}`}>
          <section className={`rounded-2xl border p-6 sm:p-8 mb-8 ${heroBg}`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-primary-500 text-white mb-4">
                  <Icon className="w-4 h-4" />
                  {config.badge}
                </span>
                <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {config.title}
                </h1>
                <p className={`text-lg font-medium mb-3 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {config.subtitle}
                </p>
                <p className={`text-sm sm:text-base leading-relaxed ${muted}`}>{config.description}</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0 w-full lg:w-auto">
                <StatPill label="In catalog" value={String(stats.total)} isDark={isDark} />
                <StatPill label="This month" value={String(stats.newThisMonth)} isDark={isDark} />
                <StatPill
                  label="Showing"
                  value={String(stats.showing)}
                  isDark={isDark}
                  className="col-span-2 sm:col-span-1"
                />
              </div>
            </div>
            {config.mode === 'popular' && stats.topName && (
              <p className={`mt-4 text-sm flex items-center gap-2 ${muted}`}>
                <ArrowTrendingUpIcon className="w-4 h-4 shrink-0" />
                Trending now: <span className="font-medium text-inherit">{stats.topName}</span>
              </p>
            )}
          </section>

          <CategoryFilter selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />

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
            <div className={`text-center py-16 rounded-xl border ${isDark ? 'border-dark-700 bg-dark-800' : 'border-gray-200 bg-white'}`}>
              <Icon className={`w-12 h-12 mx-auto mb-4 ${muted}`} />
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

function StatPill({
  label,
  value,
  isDark,
  className = '',
}: {
  label: string
  value: string
  isDark: boolean
  className?: string
}) {
  return (
    <div
      className={`rounded-xl px-4 py-3 text-center border ${className} ${
        isDark ? 'bg-dark-800/80 border-dark-600' : 'bg-white border-gray-200 shadow-sm'
      }`}
    >
      <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
    </div>
  )
}
