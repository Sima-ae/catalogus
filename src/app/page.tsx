'use client'

import { Suspense, useState, useEffect } from 'react'
import CatalogProductCount from '@/components/shop/CatalogProductCount'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import Sidebar, { SidebarMenuButton, useShopSidebar } from '@/components/layout/Sidebar'
import ProductCard from '@/components/shop/ProductCard'
import BrandFilter from '@/components/shop/BrandFilter'
import CategoryFilter from '@/components/shop/CategoryFilter'
import { Product } from '@/lib/types'
import { useTheme } from '@/lib/theme'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { appPath } from '@/lib/paths'
import { filterByBrand, filterByCategory, filterBySearch } from '@/lib/catalog'
import { useShopBrand } from '@/lib/use-shop-brand'
import { useShopCategory } from '@/lib/use-shop-category'

function HomePageContent() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
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

  useEffect(() => {
    let list = products
    if (selectedCategory === 'All') {
      list = filterByCategory(list, 'All')
    } else {
      list = list.filter((product) => product.category === selectedCategory)
      list = filterByBrand(list, selectedBrand)
    }
    list = filterBySearch(list, searchQuery)
    setFilteredProducts(list)
  }, [selectedCategory, selectedBrand, products, searchQuery])

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

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-dark-950' : 'bg-gray-50'
    } overflow-x-hidden`}>
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 flex flex-col min-w-0">
        <AppStickyHeader
          title="WELCOME"
          showSocialProof
          searchPlaceholder="Search products..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          leading={<SidebarMenuButton open={sidebarOpen} onOpen={openSidebar} />}
          actions={<ShopHeroHeaderActions />}
        />

        <main
          className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-colors duration-200 app-readable ${
            theme === 'dark' ? 'bg-dark-950' : 'bg-gray-50'
          }`}
        >
          <div className="max-w-full">
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
              <>
                <CatalogProductCount count={filteredProducts.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </>
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
