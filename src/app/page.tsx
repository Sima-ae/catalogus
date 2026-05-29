'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import ShopHeroBanner from '@/components/shop/ShopHeroBanner'
import { productsAddedThisMonth } from '@/lib/catalog'
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
import { filterByBrand, filterByCategory } from '@/lib/catalog'
import { useShopBrand } from '@/lib/use-shop-brand'
import { useShopCategory } from '@/lib/use-shop-category'

function HomePageContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const { selectedCategory, setSelectedCategory } = useShopCategory()
  const { selectedBrand, setSelectedBrand } = useShopBrand()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    let list = products
    if (selectedCategory === 'All') {
      list = filterByCategory(list, 'All')
    } else {
      list = list.filter((product) => product.category === selectedCategory)
      list = filterByBrand(list, selectedBrand)
    }
    setFilteredProducts(list)
  }, [selectedCategory, selectedBrand, products])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(appPath('/api/products'), { method: 'GET' })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format returned')
      }
      
      setProducts(data)
      setFilteredProducts(data)
      setError(null)
      
    } catch (error) {
      console.error('Error fetching products:', error)
      setError(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setProducts([])
      setFilteredProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
  }

  const retryFetch = () => {
    fetchProducts()
  }

  const heroStats = useMemo(
    () => ({
      total: products.length,
      newThisMonth: productsAddedThisMonth(products),
      showing: filteredProducts.length,
    }),
    [products, filteredProducts.length]
  )

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-dark-950' : 'bg-gray-50'
    } overflow-x-hidden`}>
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with Search and Actions */}
        <div className={`transition-colors duration-200 ${
          theme === 'dark' ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-200'
        } border-b px-4 sm:px-6 lg:px-8 py-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <MobileMenuButton onClick={() => setMobileNavOpen(true)} />
            <div className="relative flex-1 max-w-lg min-w-0">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search products..."
                  className={`w-full pl-10 pr-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    theme === 'dark' 
                      ? 'bg-dark-700 border-dark-600 text-white placeholder-gray-400' 
                      : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
            </div>

            {/* Action Icons - Right Side */}
            <div className="flex items-center flex-wrap justify-end gap-2 sm:gap-4 shrink-0">
              <ThemeToggleButton />
              
              {/* Overview/Grid Icon */}
              <button className={`p-2 rounded-lg transition-colors duration-200 ${
                theme === 'dark' 
                  ? 'text-gray-400 hover:text-white hover:bg-dark-800' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`} title="Grid View">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              
              <ShopCartHeaderButton />
              
              <ShopRegisterHeaderButtons />
            </div>
          </div>
        </div>

        <main
          className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-colors duration-200 app-readable ${
            theme === 'dark' ? 'bg-dark-950' : 'bg-gray-50'
          }`}
        >
          <div className="max-w-full">
            <ShopHeroBanner
              badge="Just added"
              title="New Arrivals"
              subtitle="Fresh templates and assets, added first here"
              description="Discover the newest WordPress themes, plugins, and digital products in our catalog. Sorted by release date so you always see what landed latest."
              icon="sparkles"
              stats={heroStats}
            />

            <CategoryFilter
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
            <BrandFilter
              selectedCategory={selectedCategory}
              selectedBrand={selectedBrand}
              onBrandChange={setSelectedBrand}
            />

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                <p className={`text-lg transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>Loading products...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Products</h3>
                <p className={`text-lg transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                } mb-4`}>{error}</p>
                <button
                  onClick={retryFetch}
                  className="btn-primary px-6 py-2"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mt-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {filteredProducts.length === 0 && !loading && !error && (
              <div className="text-center py-12">
                <p className={`text-lg transition-colors duration-200 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>No products found in this category.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  )
}
