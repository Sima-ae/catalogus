'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import Sidebar, { SidebarMenuButton, useShopSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import BrandFilter from '@/components/shop/BrandFilter'
import CategoryFilter from '@/components/shop/CategoryFilter'
import SubcategoryFilter from '@/components/shop/SubcategoryFilter'
import ShopCatalogListing, {
  CATALOG_PAGE_SIZE,
} from '@/components/shop/ShopCatalogListing'
import { Product } from '@/lib/types'
import { useTheme } from '@/lib/theme'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { appPath } from '@/lib/paths'
import { useShopBrand } from '@/lib/use-shop-brand'
import { useShopCategory } from '@/lib/use-shop-category'
import { useShopSearch } from '@/lib/use-shop-search'
import { useShopSubcategory } from '@/lib/use-shop-subcategory'
import { useShopCatalogPage } from '@/lib/use-shop-catalog-page'
import { catalogListingKey } from '@/lib/shop-catalog-url'
import {
  consumeCatalogNavState,
  getCatalogNavState,
  restoreCatalogScroll,
} from '@/lib/catalog-scroll-restore'
import { APP_NAME } from '@/lib/brand'
import {
  SparklesIcon,
  FireIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { type CatalogMode } from '@/lib/catalog'
import { buildCatalogProductsUrl, isCatalogProductsPage } from '@/lib/catalog-products'
import AppFooter from '@/components/layout/AppFooter'
import { useI18n } from '@/lib/i18n-context'

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
  const { t: tr } = useI18n()
  const [products, setProducts] = useState<Product[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const { selectedCategory, setSelectedCategory } = useShopCategory()
  const { selectedSubcategory } = useShopSubcategory(selectedCategory)
  const { selectedBrand, setSelectedBrand } = useShopBrand()
  const { searchQuery, setSearchQuery, debouncedSearch, searchPending } = useShopSearch()
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentPage, setCurrentPage } = useShopCatalogPage()
  const [reloadToken, setReloadToken] = useState(0)
  const hasLoadedOnce = useRef(false)
  const prevFilterRef = useRef<string | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const listingScrollKey = catalogListingKey(pathname ?? '', searchParams)
  const scrollRestoredRef = useRef(false)
  const { theme } = useTheme()
  const {
    open: sidebarOpen,
    openSidebar,
    closeSidebar,
    dismissSidebarManually,
    asideRef,
  } = useShopSidebar()

  const resolvedTitle =
    config.mode === 'new' ? tr('shop.new.title') : tr('shop.home.title')
  const searchPlaceholder =
    config.mode === 'new' ? tr('shop.new.searchPlaceholder') : tr('shop.home.searchPlaceholder')
  const emptyVariant = config.emptyVariant ?? 'featured'
  const showSocialProof = config.showSocialProof ?? true
  const showFooterTagline = config.showFooterTagline ?? config.mode === 'new'

  const filterSignature = `${selectedCategory}|${selectedSubcategory}|${selectedBrand}|${debouncedSearch}|${config.mode}`

  useEffect(() => {
    scrollRestoredRef.current = false
  }, [listingScrollKey])

  useEffect(() => {
    if (loading || pageLoading || products.length === 0 || scrollRestoredRef.current) return

    const state = consumeCatalogNavState(listingScrollKey)
    if (!state) return

    if (
      state.productId &&
      !products.some((p) => p.id === state.productId) &&
      currentPage !== state.page
    ) {
      setCurrentPage(state.page)
      return
    }

    scrollRestoredRef.current = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => restoreCatalogScroll(state))
    })
  }, [
    loading,
    pageLoading,
    products,
    listingScrollKey,
    currentPage,
    setCurrentPage,
  ])

  useEffect(() => {
    let cancelled = false
    const filtersChanged =
      prevFilterRef.current !== null && prevFilterRef.current !== filterSignature
    prevFilterRef.current = filterSignature

    if (filtersChanged && currentPage !== 1) {
      setCurrentPage(1)
      return
    }

    const pendingNav = getCatalogNavState()
    const pageToLoad =
      pendingNav?.listingKey === listingScrollKey ? pendingNav.page : currentPage

    if (pageToLoad !== currentPage) {
      setCurrentPage(pageToLoad)
      return
    }

    async function loadProducts() {
      if (!hasLoadedOnce.current) setLoading(true)
      else setPageLoading(true)
      setError(null)

      try {
        const url = buildCatalogProductsUrl(appPath('/api/products'), {
          page: pageToLoad,
          limit: CATALOG_PAGE_SIZE,
          category: selectedCategory,
          subcategory: selectedSubcategory !== 'All' ? selectedSubcategory : undefined,
          brand: selectedBrand,
          search: debouncedSearch || undefined,
          mode: config.mode === 'new' ? 'new' : undefined,
        })

        const response = await fetch(url, { method: 'GET' })
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

        const data: unknown = await response.json()
        if (!isCatalogProductsPage(data)) throw new Error('Invalid data format returned')
        if (cancelled) return

        setProducts(data.items)
        setTotalItems(data.total)
        hasLoadedOnce.current = true

        if (data.page !== pageToLoad && data.page >= 1) {
          setCurrentPage(data.page)
        }
      } catch (err) {
        if (cancelled) return
        setError(
          `Failed to load products: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
        setProducts([])
        setTotalItems(0)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setPageLoading(false)
        }
      }
    }

    void loadProducts()
    return () => {
      cancelled = true
    }
  }, [
    config.mode,
    currentPage,
    debouncedSearch,
    filterSignature,
    selectedBrand,
    selectedCategory,
    selectedSubcategory,
    reloadToken,
    listingScrollKey,
  ])

  const isDark = theme === 'dark'
  const EmptyIcon = config.icon ? EMPTY_ICONS[config.icon] : SparklesIcon
  const shellBg = isDark ? 'bg-dark-950' : 'bg-gray-50'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const resultsLoading = pageLoading || searchPending

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
          title={resolvedTitle}
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
                config.centerCatalog
                  ? 'mb-6 flex w-full min-w-0 flex-col gap-2'
                  : undefined
              }
            >
              <CategoryFilter
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                centered={config.centerCatalog}
              />
              <SubcategoryFilter
                selectedCategory={selectedCategory}
                centered={config.centerCatalog}
              />
              <BrandFilter
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                selectedBrand={selectedBrand}
                onBrandChange={setSelectedBrand}
                centered={config.centerCatalog}
              />
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
                <p className={`text-lg ${muted}`}>{tr('loading.products')}</p>
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
                <button
                  type="button"
                  onClick={() => setReloadToken((t) => t + 1)}
                  className="btn-primary px-6 py-2"
                >
                  Try Again
                </button>
              </div>
            ) : products.length === 0 ? (
              emptyVariant === 'simple' ? (
                <div className="text-center py-12">
                  <p className={`text-lg ${muted}`}>
                    {debouncedSearch.trim()
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
                products={products}
                page={currentPage}
                totalItems={totalItems}
                onPageChange={setCurrentPage}
                centered={config.centerCatalog}
                loading={resultsLoading}
              />
            )}
          </div>

          {config.centerCatalog ? <AppFooter /> : null}

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
