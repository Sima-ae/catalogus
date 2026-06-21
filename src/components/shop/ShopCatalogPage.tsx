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
import CatalogLoadingIndicator from '@/components/shop/CatalogLoadingIndicator'
import ShopPricelistBulkAddBar from '@/components/shop/ShopPricelistBulkAddBar'
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
import { shouldApplyShopBrandFilter, shouldPassBrandToCatalogQuery } from '@/lib/shop-brand-menu'
import {
  consumeCatalogNavState,
  restoreCatalogScroll,
} from '@/lib/catalog-scroll-restore'
import { APP_NAME } from '@/lib/brand'
import {
  SparklesIcon,
  FireIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import { type CatalogMode } from '@/lib/catalog'
import {
  buildCatalogProductsUrl,
  isCatalogProductsPage,
  type CatalogProductsPage,
} from '@/lib/catalog-products'
import { catalogSortScope } from '@/lib/catalog-sort-scope'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { useAuth } from '@/lib/auth-local'
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

function ShopCatalogPageContent({
  config,
  initialCatalog,
}: {
  config: ShopCatalogConfig
  initialCatalog?: CatalogProductsPage | null
}) {
  const { t: tr } = useI18n()
  const [products, setProducts] = useState<Product[]>(initialCatalog?.items ?? [])
  const [totalItems, setTotalItems] = useState(initialCatalog?.total ?? 0)
  const { selectedCategory, setSelectedCategory } = useShopCategory()
  const { selectedSubcategory, hasSubcategories, loadingSubcategories } =
    useShopSubcategory(selectedCategory)
  const { selectedBrand, setSelectedBrand } = useShopBrand()
  const { searchQuery, setSearchQuery, debouncedSearch, searchPending } = useShopSearch()
  const [loading, setLoading] = useState(!initialCatalog)
  const [pageLoading, setPageLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentPage, setCurrentPage } = useShopCatalogPage()
  const [reloadToken, setReloadToken] = useState(0)
  const [reorderSaving, setReorderSaving] = useState(false)
  const hasLoadedOnce = useRef(Boolean(initialCatalog))
  const skippedInitialFetch = useRef(false)
  const { user, isAdmin } = useAuth()
  const [categoryProductCount, setCategoryProductCount] = useState<number | null>(null)
  const [brandProductCount, setBrandProductCount] = useState<number | null>(null)
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

  const resolvedTitle = config.mode === 'new' ? tr('shop.new.title') : ''
  const searchPlaceholder =
    config.mode === 'new' ? tr('shop.new.searchPlaceholder') : tr('shop.home.searchPlaceholder')
  const emptyVariant = config.emptyVariant ?? 'featured'
  const showSocialProof = config.showSocialProof ?? true
  const showFooterTagline = config.showFooterTagline ?? config.mode === 'new'

  const filterBrand = searchParams.get('brand')?.trim() || 'All'
  const filterTag = searchParams.get('tag')?.trim() || ''
  const brandFilterCtx = {
    selectedCategory,
    selectedSubcategory,
    hasSubcategories,
    loadingSubcategories,
  }
  const brandFilterActive = shouldApplyShopBrandFilter(filterBrand, brandFilterCtx)
  const brandQueryActive = shouldPassBrandToCatalogQuery(filterBrand)
  const filterSignature = `${selectedCategory}|${selectedSubcategory}|${filterBrand}|${filterTag}|${debouncedSearch}|${config.mode}`
  const reorderScope = catalogSortScope({
    mode: config.mode === 'new' ? 'new' : undefined,
    category: selectedCategory !== 'All' ? selectedCategory : undefined,
    subcategory: selectedSubcategory !== 'All' ? selectedSubcategory : undefined,
    brand: brandQueryActive ? filterBrand : undefined,
    tag: filterTag || undefined,
    search: debouncedSearch || undefined,
  })

  const handleReorder = async (productIds: string[]) => {
    if (!isAdmin || !reorderScope || !user) return
    setReorderSaving(true)
    try {
      const res = await fetch(appPath('/api/admin/catalog/reorder'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scope: reorderScope,
          productIds,
          page: currentPage,
          pageSize: CATALOG_PAGE_SIZE,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setProducts((prev) => {
        const byId = new Map(prev.map((p) => [p.id, p]))
        return productIds.map((id) => byId.get(id)).filter(Boolean) as Product[]
      })
    } catch (err) {
      setReloadToken((t) => t + 1)
      setError(
        `Failed to save order: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    } finally {
      setReorderSaving(false)
    }
  }

  const handleProductDeleted = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    setTotalItems((prev) => Math.max(0, prev - 1))
  }

  const handleProductBrandUpdated = (
    productId: string,
    patch: { name: string; brand: string | null }
  ) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, name: patch.name, brand: patch.brand ?? undefined }
          : p
      )
    )
  }

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

    const pageToLoad = currentPage
    const isDefaultBrowse =
      pageToLoad === 1 &&
      selectedCategory === 'All' &&
      selectedSubcategory === 'All' &&
      !brandQueryActive &&
      !filterTag &&
      !debouncedSearch

    if (
      initialCatalog &&
      !skippedInitialFetch.current &&
      isDefaultBrowse &&
      reloadToken === 0
    ) {
      skippedInitialFetch.current = true
      hasLoadedOnce.current = true
      setLoading(false)
      setPageLoading(false)
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
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          subcategory: selectedSubcategory !== 'All' ? selectedSubcategory : undefined,
          brand: brandQueryActive ? filterBrand : undefined,
          tag: filterTag || undefined,
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
    reloadToken,
    initialCatalog,
    brandQueryActive,
    filterTag,
    selectedCategory,
    selectedSubcategory,
  ])

  useEffect(() => {
    if (!isAdmin || !user) {
      setCategoryProductCount(null)
      setBrandProductCount(null)
      return
    }

    let cancelled = false
    const showCategory = selectedCategory !== 'All'
    const showBrand = brandQueryActive && filterBrand !== 'All'

    async function fetchCount(params: {
      category?: string
      subcategory?: string
      brand?: string
    }): Promise<number> {
      const url = buildCatalogProductsUrl(appPath('/api/products'), {
        page: 1,
        limit: 1,
        ...params,
        mode: config.mode === 'new' ? 'new' : undefined,
      })
      const res = await fetch(url, { method: 'GET' })
      if (!res.ok) return 0
      const data: unknown = await res.json()
      if (!isCatalogProductsPage(data)) return 0
      return data.total
    }

    async function loadCounts() {
      const tasks: Promise<void>[] = []

      if (showCategory) {
        tasks.push(
          fetchCount({
            category: selectedCategory,
            subcategory: selectedSubcategory !== 'All' ? selectedSubcategory : undefined,
          }).then((n) => {
            if (!cancelled) setCategoryProductCount(n)
          })
        )
      } else if (!cancelled) {
        setCategoryProductCount(null)
      }

      if (showBrand) {
        tasks.push(
          fetchCount({
            category: selectedCategory !== 'All' ? selectedCategory : undefined,
            subcategory: selectedSubcategory !== 'All' ? selectedSubcategory : undefined,
            brand: filterBrand,
          }).then((n) => {
            if (!cancelled) setBrandProductCount(n)
          })
        )
      } else if (!cancelled) {
        setBrandProductCount(null)
      }

      await Promise.all(tasks)
    }

    void loadCounts()
    return () => {
      cancelled = true
    }
  }, [
    brandQueryActive,
    config.mode,
    filterBrand,
    isAdmin,
    selectedCategory,
    selectedSubcategory,
    user,
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
                selectedBrand={selectedBrand}
                onBrandChange={setSelectedBrand}
                centered={config.centerCatalog}
              />
            </div>

            {isAdmin && user ? (
              <ShopPricelistBulkAddBar
                user={user}
                isDark={isDark}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                selectedBrand={filterBrand}
                brandFilterActive={brandFilterActive}
                categoryProductCount={categoryProductCount}
                brandProductCount={brandProductCount}
              />
            ) : null}

            {loading || resultsLoading ? (
              <CatalogLoadingIndicator />
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
                onProductDeleted={handleProductDeleted}
                onProductBrandUpdated={handleProductBrandUpdated}
                onReorder={isAdmin ? handleReorder : undefined}
                reorderScope={isAdmin ? reorderScope : null}
                reorderSaving={reorderSaving}
                centered={config.centerCatalog}
              />
            )}
          </div>

          {config.centerCatalog ? <AppFooter /> : null}

          {showFooterTagline ? (
            <p className={`mt-10 text-center text-xs ${muted}`}>
              {APP_NAME} — {tr('site.tagline')}
            </p>
          ) : null}
        </main>
      </div>
    </div>
  )
}

export default function ShopCatalogPage({
  config,
  initialCatalog,
}: {
  config: ShopCatalogConfig
  initialCatalog?: CatalogProductsPage | null
}) {
  return (
    <Suspense fallback={null}>
      <ShopCatalogPageContent config={config} initialCatalog={initialCatalog} />
    </Suspense>
  )
}
