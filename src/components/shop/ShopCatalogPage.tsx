'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import Sidebar, { SidebarMenuButton, useShopSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import BrandFilter from '@/components/shop/BrandFilter'
import CategoryFilter from '@/components/shop/CategoryFilter'
import SubcategoryFilter from '@/components/shop/SubcategoryFilter'
import ShopCatalogListing from '@/components/shop/ShopCatalogListing'
import FeaturedCatalogExhaustedModal from '@/components/shop/FeaturedCatalogExhaustedModal'
import type { ProductQuickEditSaved } from '@/components/shop/ProductCardBrandEditButton'
import type { ProductFeaturedSaved } from '@/components/shop/FeaturedStarButton'
import CatalogLoadingOverlay from '@/components/shop/CatalogLoadingOverlay'
import ShopPricelistBulkAddBar from '@/components/shop/ShopPricelistBulkAddBar'
import { Product } from '@/lib/types'
import { useTheme } from '@/lib/theme'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { appPath } from '@/lib/paths'
import { useShopBrand } from '@/lib/use-shop-brand'
import { useShopCategory } from '@/lib/use-shop-category'
import { useShopSearch } from '@/lib/use-shop-search'
import { useShopNestedSubcategory, useShopSubcategory } from '@/lib/use-shop-subcategory'
import { useShopCatalogPage } from '@/lib/use-shop-catalog-page'
import { catalogListingKey } from '@/lib/shop-catalog-url'
import { shouldApplyShopBrandFilter, shouldPassBrandToCatalogQuery } from '@/lib/shop-brand-menu'
import { fetchCatalogJson, isCatalogFetchAbortError } from '@/lib/catalog-fetch-client'
import {
  shouldDeferShopCatalogProductLoad,
  shopNestedSubcategoryForApiQuery,
  shopSubcategoryForApiQuery,
} from '@/lib/shop-catalog-browse'
import { brandCompoundIncludesSegment } from '@/lib/product-taxonomy'
import { invalidateShopBrandMenuCache, prefetchShopBrandMenu } from '@/lib/use-shop-brand-list'
import { prefetchShopSubcategories } from '@/lib/use-shop-subcategory'
import { prefetchShopCategoryTaxonomy, hydrateShopCategoryNav } from '@/lib/shop-categories-client'
import type { ShopCategoryNavNode } from '@/lib/shop-category-nav'
import { categoryHasBrowseChildren } from '@/lib/shop-catalog-navigation'
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
  CATALOG_PAGE_SIZE,
  catalogPageBaseOffset,
  isCatalogProductsPage,
  itemsOnCatalogPage,
  type CatalogProductsPage,
} from '@/lib/catalog-products'
import { catalogSortScope } from '@/lib/catalog-sort-scope'
import {
  consumePrefetchedShopCatalog,
  getCachedShopCatalog,
  invalidateShopCatalogCache,
  isShopCatalogCacheFresh,
  isShopCatalogCacheTotalTrusted,
  prefetchShopCatalogFilter,
  setCachedShopCatalog,
  shopCatalogClientSignature,
  type ShopCatalogFilterPrefetch,
} from '@/lib/shop-catalog-client-cache'
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
  /** Randomize unfiltered homepage catalog (not used on /new). */
  shuffleCatalog?: boolean
  /** Featured-only storefront (1-1.club) — skip full-catalog warmups / social proof. */
  featuredStorefront?: boolean
}

function ShopCatalogPageContent({
  config,
  initialCatalog,
  initialCatalogSignature,
  initialCategoryNav,
}: {
  config: ShopCatalogConfig
  initialCatalog?: CatalogProductsPage | null
  initialCatalogSignature?: string
  initialCategoryNav?: ShopCategoryNavNode[] | null
}) {
  const { t: tr } = useI18n()
  if (initialCategoryNav?.length) {
    hydrateShopCategoryNav(initialCategoryNav)
  }
  const [products, setProducts] = useState<Product[]>(initialCatalog?.items ?? [])
  const [totalItems, setTotalItems] = useState(initialCatalog?.total ?? 0)
  const [fullCatalogTotal, setFullCatalogTotal] = useState(
    () => initialCatalog?.fullCatalogTotal ?? 0
  )
  const [showFullCatalogModal, setShowFullCatalogModal] = useState(false)
  const isFeaturedOnlyHost = Boolean(config.featuredStorefront)
  const { selectedCategory, setSelectedCategory } = useShopCategory()
  const [optimisticCategory, setOptimisticCategory] = useState<string | null>(null)
  const [optimisticSubcategory, setOptimisticSubcategory] = useState<string | null>(null)
  const [optimisticNestedSubcategory, setOptimisticNestedSubcategory] = useState<string | null>(
    null
  )
  const [optimisticBrand, setOptimisticBrand] = useState<string | null>(null)
  const activeCategory = optimisticCategory ?? selectedCategory
  const subcategoryState = useShopSubcategory(activeCategory)
  const {
    selectedSubcategory,
    setSelectedSubcategory,
    hasSubcategories,
    loadingSubcategories,
    needsSubcategoryPick,
  } = subcategoryState
  const activeSubcategory = optimisticSubcategory ?? selectedSubcategory
  const nestedSubcategoryState = useShopNestedSubcategory(
    activeCategory,
    activeSubcategory
  )
  const {
    selectedNestedSubcategory,
    setSelectedNestedSubcategory,
    hasNestedSubcategories,
    loadingNestedSubcategories,
    nestedSubcategoryOptions,
    needsNestedSubcategoryPick,
  } = nestedSubcategoryState
  const effectiveNestedSubcategory =
    optimisticNestedSubcategory ?? selectedNestedSubcategory
  const { selectedBrand, setSelectedBrand } = useShopBrand({
    selectedCategory: activeCategory,
    subcategoryState: {
      ...subcategoryState,
      selectedSubcategory: activeSubcategory,
    },
    nestedSubcategoryState: {
      ...nestedSubcategoryState,
      selectedNestedSubcategory: effectiveNestedSubcategory,
    },
  })
  const { searchQuery, setSearchQuery, debouncedSearch, searchPending } = useShopSearch()
  const [loading, setLoading] = useState(!initialCatalog)
  const [pageLoading, setPageLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentPage, setCurrentPage } = useShopCatalogPage()
  const [reloadToken, setReloadToken] = useState(0)
  /** Bumps on every filter click so the load effect re-runs even for the same pill (avoids 88% hang). */
  const [catalogNavNonce, setCatalogNavNonce] = useState(0)
  const [reorderSaving, setReorderSaving] = useState(false)
  const [filterNavigating, setFilterNavigating] = useState(false)
  const hasLoadedOnce = useRef(Boolean(initialCatalog))
  const productsRef = useRef(products)
  productsRef.current = products
  const totalItemsRef = useRef(totalItems)
  totalItemsRef.current = totalItems
  const { user, isAdmin } = useAuth()
  const [categoryProductCount, setCategoryProductCount] = useState<number | null>(null)
  const [brandProductCount, setBrandProductCount] = useState<number | null>(null)
  const prevFilterRef = useRef<string | null>(null)
  const catalogLoadGenRef = useRef(0)
  /** SSR hydrate signature — read in the load effect without putting page in deps. */
  const initialCatalogSignatureRef = useRef(initialCatalogSignature)
  const initialCatalogRef = useRef(initialCatalog)
  initialCatalogRef.current = initialCatalog
  if (initialCatalog) {
    initialCatalogSignatureRef.current = initialCatalogSignature
  }
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

  useEffect(() => {
    prefetchShopCategoryTaxonomy()
  }, [])

  const resolvedTitle = ''
  const searchPlaceholder =
    config.mode === 'new' ? tr('shop.new.searchPlaceholder') : tr('shop.home.searchPlaceholder')
  const emptyVariant = config.emptyVariant ?? 'featured'
  const showSocialProof = config.showSocialProof ?? true
  const showFooterTagline = config.showFooterTagline ?? config.mode === 'new'

  const filterBrand = searchParams.get('brand')?.trim() || 'All'
  const filterTag = searchParams.get('tag')?.trim() || ''
  const brandFilterCtx = {
    selectedCategory: activeCategory,
    selectedSubcategory: activeSubcategory,
    selectedNestedSubcategory: effectiveNestedSubcategory,
    hasSubcategories,
    hasNestedSubcategories,
    loadingSubcategories,
    loadingNestedSubcategories,
  }
  const brandFilterActive = shouldApplyShopBrandFilter(filterBrand, brandFilterCtx)
  const brandQueryActive = shouldPassBrandToCatalogQuery(filterBrand)
  // Only block the grid while subcategory menus load when this category actually has
  // browse children. Categories like WATCHES (brands only) must not clear products.
  const categoryMayHaveSubcategories = categoryHasBrowseChildren(activeCategory)
  const categoryMayHaveNestedSubcategories =
    categoryMayHaveSubcategories &&
    activeSubcategory !== 'All' &&
    activeSubcategory !== ''
  const effectiveNeedsSubcategoryPick =
    hasSubcategories && !loadingSubcategories && activeSubcategory === ''
  const effectiveNeedsNestedSubcategoryPick =
    hasNestedSubcategories &&
    !loadingNestedSubcategories &&
    activeSubcategory !== 'All' &&
    effectiveNestedSubcategory === ''
  const catalogBrowseDeferred = shouldDeferShopCatalogProductLoad({
    searchActive: Boolean(debouncedSearch.trim()),
    loadingSubcategories: loadingSubcategories && categoryMayHaveSubcategories,
    needsSubcategoryPick: effectiveNeedsSubcategoryPick,
    loadingNestedSubcategories:
      loadingNestedSubcategories && categoryMayHaveNestedSubcategories,
    needsNestedSubcategoryPick: effectiveNeedsNestedSubcategoryPick,
  })
  // Real filter keys only — do not include browse-deferred, or flipping ready→deferred
  // resets ?page= and restarts the load loop on category pages.
  const filterSignature = `${activeCategory}|${activeSubcategory}|${effectiveNestedSubcategory}|${filterBrand}|${filterTag}|${debouncedSearch}|${config.mode}`

  const catalogMode = config.mode === 'new' ? 'new' : 'all'

  const itemsOnCurrentPage = useMemo(
    () => itemsOnCatalogPage(totalItems, currentPage),
    [totalItems, currentPage]
  )

    const catalogShuffle =
    config.shuffleCatalog === true &&
    selectedCategory === 'All' &&
    selectedSubcategory === 'All' &&
    selectedNestedSubcategory === 'All' &&
    !brandQueryActive &&
    !filterTag &&
    !debouncedSearch.trim()

  /** 1-1.club homepage: skip client cache so a hard refresh re-randomizes. */
  const skipCatalogClientCache = isFeaturedOnlyHost && catalogShuffle && currentPage <= 1

  // Homepage shuffle always returns a full page from the API — never mid-page top-ups
  // (those used odd offsets and made "showing X–Y" look wrong).
  const hasMoreOnPage =
    !catalogShuffle &&
    products.length > 0 &&
    products.length < itemsOnCurrentPage &&
    !pageLoading

  const buildCatalogFetchUrl = useCallback(
    (pageToLoad: number, rowOffset: number) =>
      buildCatalogProductsUrl(appPath('/api/products'), {
        page: pageToLoad,
        limit: CATALOG_PAGE_SIZE,
        offset: rowOffset,
        category: activeCategory !== 'All' ? activeCategory : undefined,
        subcategory: shopSubcategoryForApiQuery(activeSubcategory),
        nested: shopNestedSubcategoryForApiQuery(effectiveNestedSubcategory),
        brand: brandQueryActive ? filterBrand : undefined,
        tag: filterTag || undefined,
        search: debouncedSearch || undefined,
        mode: catalogMode === 'new' ? 'new' : undefined,
        shuffle: catalogShuffle ? true : undefined,
        // Featured hosts: include the tiny featured COUNT in the same response (no second trip / no full catalog).
        skipTotal: isFeaturedOnlyHost ? false : true,
      }),
    [
      activeCategory,
      activeSubcategory,
      brandQueryActive,
      catalogMode,
      catalogShuffle,
      debouncedSearch,
      effectiveNestedSubcategory,
      filterBrand,
      filterTag,
      isFeaturedOnlyHost,
    ]
  )

  const buildCatalogTotalUrl = useCallback(
    () =>
      buildCatalogProductsUrl(appPath('/api/products'), {
        page: 1,
        limit: 1,
        category: activeCategory !== 'All' ? activeCategory : undefined,
        subcategory: shopSubcategoryForApiQuery(activeSubcategory),
        nested: shopNestedSubcategoryForApiQuery(effectiveNestedSubcategory),
        brand: brandQueryActive ? filterBrand : undefined,
        tag: filterTag || undefined,
        search: debouncedSearch || undefined,
        mode: catalogMode === 'new' ? 'new' : undefined,
        countOnly: true,
      }),
    [
      activeCategory,
      activeSubcategory,
      brandQueryActive,
      catalogMode,
      debouncedSearch,
      effectiveNestedSubcategory,
      filterBrand,
      filterTag,
    ]
  )

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage === currentPage) {
        setPageLoading(false)
        setFilterNavigating(false)
        return
      }
      setPageLoading(true)
      setFilterNavigating(false)
      setCurrentPage(nextPage)
    },
    [currentPage, setCurrentPage]
  )

  const openFullCatalogModal = useCallback(() => {
    setShowFullCatalogModal(true)
    if (fullCatalogTotal > 0) return
    void fetchCatalogJson(
      buildCatalogProductsUrl(appPath('/api/products'), {
        page: 1,
        limit: 1,
        countOnly: true,
      }) + '&catalogScope=all'
    )
      .then((payload) => {
        if (!isCatalogProductsPage(payload)) return
        const total =
          typeof payload.fullCatalogTotal === 'number' && payload.fullCatalogTotal > 0
            ? payload.fullCatalogTotal
            : typeof payload.total === 'number'
              ? payload.total
              : 0
        if (total > 0) setFullCatalogTotal(total)
      })
      .catch(() => undefined)
  }, [fullCatalogTotal])

  const loadMoreProducts = useCallback(async () => {
    if (catalogShuffle || loadingMore || pageLoading) return

    const loaded = productsRef.current
    const baseOffset = catalogPageBaseOffset(currentPage)
    const remainingOnPage = itemsOnCatalogPage(totalItems, currentPage) - loaded.length
    if (remainingOnPage <= 0) return

    setLoadingMore(true)
    try {
      const data: unknown = await fetchCatalogJson(
        buildCatalogFetchUrl(currentPage, baseOffset + loaded.length)
      )
      if (!isCatalogProductsPage(data)) throw new Error('Invalid data format returned')

      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        const merged = [...prev]
        for (const item of data.items) {
          if (!seen.has(item.id)) merged.push(item)
        }
        const knownTotal =
          !data.skipTotal && typeof data.total === 'number' && data.total > 0
            ? data.total
            : totalItemsRef.current || totalItems
        const cap =
          knownTotal > 0
            ? itemsOnCatalogPage(knownTotal, currentPage)
            : CATALOG_PAGE_SIZE
        return merged.slice(0, cap)
      })
      // skipTotal payloads use total=0 as a placeholder — never wipe the real count.
      if (!data.skipTotal && typeof data.total === 'number' && data.total > 0) {
        setTotalItems(data.total)
        totalItemsRef.current = data.total
      }
    } catch (err) {
      if (isCatalogFetchAbortError(err)) return
      setError(
        `Failed to load products: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    } finally {
      setLoadingMore(false)
    }
  }, [buildCatalogFetchUrl, catalogShuffle, currentPage, loadingMore, pageLoading, totalItems])

  const beginInstantFilterFeedback = useCallback(() => {
    // Keep the previous grid visible under the overlay — clearing caused empty flashes
    // and made category clicks feel broken.
    setPageLoading(true)
    setFilterNavigating(true)
    setError(null)
    // Re-clicking the same category/brand must re-enter the load effect; otherwise
    // pageLoading stays true and the overlay hangs at ~88%.
    setCatalogNavNonce((n) => n + 1)
  }, [])

  const beginFilterNavigation = useCallback(
    (prefetch?: ShopCatalogFilterPrefetch) => {
      setFilterNavigating(true)
      if (prefetch) {
        if (prefetch.category) {
          prefetchShopSubcategories(prefetch.category)
          prefetchShopBrandMenu(
            prefetch.category,
            prefetch.subcategory ?? 'All',
            prefetch.nested ?? 'All'
          )
        }
        prefetchShopCatalogFilter(prefetch)
      }
    },
    []
  )

  const handleCategoryChange = useCallback(
    (category: string) => {
      beginInstantFilterFeedback()
      setOptimisticCategory(category)
      setOptimisticSubcategory(null)
      setOptimisticNestedSubcategory(null)
      setOptimisticBrand(null)
      prefetchShopCategoryTaxonomy()
      if (category !== 'All') {
        prefetchShopSubcategories(category)
        if (!categoryHasBrowseChildren(category)) {
          beginFilterNavigation({
            page: 1,
            category,
            mode: catalogMode,
          })
        }
      } else if (config.shuffleCatalog) {
        beginFilterNavigation({
          page: 1,
          mode: catalogMode,
          shuffle: true,
        })
      } else {
        beginFilterNavigation({
          page: 1,
          mode: catalogMode,
        })
      }
      setSelectedCategory(category)
    },
    [
      beginFilterNavigation,
      beginInstantFilterFeedback,
      catalogMode,
      config.shuffleCatalog,
      setSelectedCategory,
    ]
  )

  const handleSubcategoryChange = useCallback(
    (subcategory: string) => {
      beginInstantFilterFeedback()
      setOptimisticSubcategory(subcategory)
      setOptimisticNestedSubcategory(null)
      beginFilterNavigation({
        page: 1,
        category: activeCategory !== 'All' ? activeCategory : undefined,
        subcategory: shopSubcategoryForApiQuery(subcategory),
        mode: catalogMode,
      })
      setSelectedSubcategory(subcategory)
    },
    [
      activeCategory,
      beginFilterNavigation,
      beginInstantFilterFeedback,
      catalogMode,
      setSelectedSubcategory,
    ]
  )

  const handleNestedSubcategoryChange = useCallback(
    (nested: string) => {
      beginInstantFilterFeedback()
      setOptimisticNestedSubcategory(nested)
      beginFilterNavigation({
        page: 1,
        category: activeCategory !== 'All' ? activeCategory : undefined,
        subcategory: shopSubcategoryForApiQuery(activeSubcategory),
        nested: shopNestedSubcategoryForApiQuery(nested),
        mode: catalogMode,
      })
      setSelectedNestedSubcategory(nested)
    },
    [
      activeCategory,
      activeSubcategory,
      beginFilterNavigation,
      beginInstantFilterFeedback,
      catalogMode,
      setSelectedNestedSubcategory,
    ]
  )

  const handleBrandChange = useCallback(
    (brand: string) => {
      beginInstantFilterFeedback()
      setOptimisticBrand(brand)
      beginFilterNavigation({
        page: 1,
        category: activeCategory !== 'All' ? activeCategory : undefined,
        subcategory: shopSubcategoryForApiQuery(activeSubcategory),
        nested: shopNestedSubcategoryForApiQuery(selectedNestedSubcategory),
        brand: brand !== 'All' ? brand : undefined,
        mode: catalogMode,
      })
      setSelectedBrand(brand)
    },
    [
      activeCategory,
      activeSubcategory,
      beginFilterNavigation,
      beginInstantFilterFeedback,
      catalogMode,
      selectedNestedSubcategory,
      setSelectedBrand,
    ]
  )

  const prefetchCatalogHover = useCallback(
    (patch: Partial<ShopCatalogFilterPrefetch>) => {
      const category =
        patch.category ?? (selectedCategory !== 'All' ? selectedCategory : undefined)
      const subcategory =
        patch.subcategory ??
        shopSubcategoryForApiQuery(selectedSubcategory)
      const nested =
        patch.nested ??
        shopNestedSubcategoryForApiQuery(selectedNestedSubcategory)

      if (category) {
        prefetchShopSubcategories(category)
        prefetchShopBrandMenu(category, subcategory ?? 'All', nested ?? 'All')
      }

      const shuffleTarget =
        patch.shuffle ??
        (catalogShuffle &&
        !patch.category &&
        !patch.subcategory &&
        !patch.nested &&
        !patch.brand &&
        !patch.search
          ? true
          : undefined)

      prefetchShopCatalogFilter({
        page: patch.page ?? 1,
        category,
        subcategory,
        nested,
        brand: patch.brand ?? (brandQueryActive ? filterBrand : undefined),
        tag: patch.tag ?? (filterTag || undefined),
        search: patch.search ?? (debouncedSearch || undefined),
        mode: patch.mode ?? catalogMode,
        shuffle: shuffleTarget,
      })
    },
    [
      brandQueryActive,
      catalogMode,
      debouncedSearch,
      filterBrand,
      filterTag,
      selectedCategory,
      selectedSubcategory,
      selectedNestedSubcategory,
    ]
  )

  const nestedPillState = useMemo(
    () => ({
      selectedSubcategory: nestedSubcategoryState.selectedNestedSubcategory,
      setSelectedSubcategory: nestedSubcategoryState.setSelectedNestedSubcategory,
      subcategoryOptions: nestedSubcategoryState.nestedSubcategoryOptions,
      hasSubcategories: nestedSubcategoryState.hasNestedSubcategories,
      loadingSubcategories: nestedSubcategoryState.loadingNestedSubcategories,
      needsSubcategoryPick: nestedSubcategoryState.needsNestedSubcategoryPick,
    }),
    [nestedSubcategoryState]
  )

  useEffect(() => {
    setOptimisticCategory(null)
    setOptimisticSubcategory(null)
    setOptimisticNestedSubcategory(null)
    setOptimisticBrand(null)
  }, [searchParams])

  const reorderScope = catalogSortScope({
    mode: config.mode === 'new' ? 'new' : undefined,
    category: selectedCategory !== 'All' ? selectedCategory : undefined,
    subcategory: shopSubcategoryForApiQuery(selectedSubcategory),
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
    invalidateShopCatalogCache()
  }

  /** Broken-image OOS: soft-hide only — never shrink totals / bust cache / open load-more. */
  const handleProductUnavailable = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, sold_out: true, image_url: p.image_url ? '' : p.image_url }
          : p
      )
    )
  }

  const handleProductQuickEditSaved = (saved: ProductQuickEditSaved) => {
    const activeBrand = filterBrand.trim()
    const matchesBrandFilter =
      !brandQueryActive ||
      !activeBrand ||
      activeBrand === 'All' ||
      brandCompoundIncludesSegment(saved.brand ?? '', activeBrand)

    if (!matchesBrandFilter) {
      setProducts((prev) => prev.filter((p) => p.id !== saved.productId))
      setTotalItems((prev) => Math.max(0, prev - 1))
    } else {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === saved.productId
            ? { ...p, name: saved.name, brand: saved.brand ?? undefined }
            : p
        )
      )
    }

    invalidateShopBrandMenuCache()
    setReloadToken((t) => t + 1)
  }

  const handleProductFeaturedSaved = (saved: ProductFeaturedSaved) => {
    // Featured-only hosts (1-1.club) drop the product from the live grid when cleared.
    const onFeaturedOnlyHost =
      typeof window !== 'undefined' &&
      /(?:^|\.)1-1\.club$/i.test(window.location.hostname)

    if (onFeaturedOnlyHost && !saved.featured) {
      setProducts((prev) => prev.filter((p) => p.id !== saved.productId))
      setTotalItems((prev) => Math.max(0, prev - 1))
    } else {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === saved.productId ? { ...p, featured: saved.featured } : p
        )
      )
    }
    invalidateShopCatalogCache()
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

    if (
      state.productId &&
      !products.some((p) => p.id === state.productId) &&
      currentPage === state.page &&
      hasMoreOnPage &&
      !loadingMore
    ) {
      void loadMoreProducts()
      return
    }

    scrollRestoredRef.current = true
    requestAnimationFrame(() => {
      requestAnimationFrame(() => restoreCatalogScroll(state))
    })
  }, [
    hasMoreOnPage,
    loadMoreProducts,
    loading,
    loadingMore,
    pageLoading,
    products,
    listingScrollKey,
    currentPage,
    setCurrentPage,
  ])

  useEffect(() => {
    let cancelled = false
    const loadGen = ++catalogLoadGenRef.current
    const filtersChanged =
      prevFilterRef.current !== null && prevFilterRef.current !== filterSignature

    // Load page 1 immediately when filters change — do not early-return (that aborted the
    // in-flight request and left pageLoading/filterNavigating stuck at the 88% overlay).
    const pageToLoad = filtersChanged ? 1 : currentPage
    if (filtersChanged && currentPage !== 1) {
      totalItemsRef.current = 0
      setTotalItems(0)
      setCurrentPage(1)
    }

    prevFilterRef.current = filterSignature
    if (filtersChanged) {
      totalItemsRef.current = 0
      setTotalItems(0)
    }

    const clearLoadingFlags = () => {
      if (cancelled || loadGen !== catalogLoadGenRef.current) return
      setLoading(false)
      setPageLoading(false)
      setFilterNavigating(false)
    }

    if (catalogBrowseDeferred) {
      // While subcategory menus load, keep the previous grid — never wipe to empty.
      clearLoadingFlags()
      setError(null)
      return () => {
        cancelled = true
      }
    }

    const fetchFilters: ShopCatalogFilterPrefetch = {
      page: pageToLoad,
      category: activeCategory !== 'All' ? activeCategory : undefined,
      subcategory: shopSubcategoryForApiQuery(activeSubcategory),
      nested: shopNestedSubcategoryForApiQuery(effectiveNestedSubcategory),
      brand: brandQueryActive ? filterBrand : undefined,
      tag: filterTag || undefined,
      search: debouncedSearch || undefined,
      mode: catalogMode === 'new' ? 'new' : undefined,
      shuffle: catalogShuffle ? true : undefined,
    }
    const clientCatalogSignature = shopCatalogClientSignature(fetchFilters)

    const patchCachedTotal = (total: number) => {
      if (skipCatalogClientCache) return
      if (!(total > 0)) return
      const existing = getCachedShopCatalog(clientCatalogSignature)
      if (!existing?.items?.length) return
      setCachedShopCatalog(
        clientCatalogSignature,
        {
          ...existing,
          total,
          totalPages: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE) || 1),
          skipTotal: undefined,
        },
        { shuffle: catalogShuffle }
      )
    }

    const applyCatalogPage = (data: CatalogProductsPage) => {
      const rawItems = Array.isArray(data.items) ? data.items : []
      if (typeof data.fullCatalogTotal === 'number' && data.fullCatalogTotal > 0) {
        setFullCatalogTotal(data.fullCatalogTotal)
      }
      const knownTotal =
        !data.skipTotal && typeof data.total === 'number' && data.total > 0
          ? data.total
          : totalItemsRef.current
      // Homepage shuffle: never cap to a bogus short total (e.g. 15 from a floor).
      const pageCap = catalogShuffle
        ? CATALOG_PAGE_SIZE
        : knownTotal > 0
          ? itemsOnCatalogPage(knownTotal, pageToLoad)
          : CATALOG_PAGE_SIZE
      setProducts(rawItems.slice(0, pageCap))
      // skipTotal payloads use total=0 as a placeholder — never treat that as the real count.
      // Never cache a total from totalItemsRef (can be the previous filter) or page size.
      if (!data.skipTotal && typeof data.total === 'number' && data.total >= 0) {
        totalItemsRef.current = data.total
        setTotalItems(data.total)
        if (!skipCatalogClientCache && (data.total > 0 || data.items.length === 0)) {
          setCachedShopCatalog(
            clientCatalogSignature,
            {
              ...data,
              total: data.total,
              totalPages: Math.max(1, Math.ceil(data.total / CATALOG_PAGE_SIZE) || 1),
              skipTotal: undefined,
            },
            { shuffle: catalogShuffle }
          )
        }
      } else if (data.items.length > 0 && totalItemsRef.current <= 0) {
        // Temporary floor — NEVER use items.length for homepage shuffle (looks like "15 van 15").
        if (!catalogShuffle) {
          setTotalItems(data.items.length)
        }
        if (!skipCatalogClientCache) {
          setCachedShopCatalog(
            clientCatalogSignature,
            { ...data, total: 0, skipTotal: true },
            { shuffle: catalogShuffle }
          )
        }
      } else if (data.items.length > 0) {
        if (!skipCatalogClientCache) {
          setCachedShopCatalog(
            clientCatalogSignature,
            {
              ...data,
              total: totalItemsRef.current > 0 ? totalItemsRef.current : 0,
              skipTotal: totalItemsRef.current <= 0 ? true : undefined,
            },
            { shuffle: catalogShuffle }
          )
        }
      }

      // Featured host: empty page after Next → upgrade CTA, then return to last valid page.
      if (isFeaturedOnlyHost && pageToLoad > 1 && rawItems.length === 0) {
        setShowFullCatalogModal(true)
        const lastPage = Math.max(
          1,
          Math.ceil((totalItemsRef.current || 0) / CATALOG_PAGE_SIZE) || 1
        )
        if (currentPage !== lastPage) setCurrentPage(lastPage)
      }

      hasLoadedOnce.current = true
      if (data.page !== pageToLoad && data.page >= 1 && !filtersChanged) {
        setCurrentPage(data.page)
      }
    }

    const ssrCatalog = initialCatalogRef.current
    if (
      reloadToken === 0 &&
      ssrCatalog &&
      initialCatalogSignatureRef.current === clientCatalogSignature
    ) {
      applyCatalogPage(ssrCatalog)
      clearLoadingFlags()
      setError(null)
      // If SSR skipped or floored the total (e.g. old payload), resolve the real count.
      if (
        catalogMode === 'new' &&
        (ssrCatalog.skipTotal ||
          !(typeof ssrCatalog.total === 'number' && ssrCatalog.total > ssrCatalog.items.length))
      ) {
        void fetchCatalogJson(buildCatalogTotalUrl())
          .then((payload) => {
            if (cancelled) return
            if (!isCatalogProductsPage(payload)) return
            if (typeof payload.total === 'number' && payload.total > 0) {
              totalItemsRef.current = payload.total
              setTotalItems(payload.total)
              patchCachedTotal(payload.total)
            }
          })
          .catch(() => undefined)
      }
      return () => {
        cancelled = true
      }
    }

    const prefetched =
      !skipCatalogClientCache && reloadToken === 0
        ? consumePrefetchedShopCatalog(fetchFilters)
        : null
    const cachedFromStore =
      !skipCatalogClientCache && reloadToken === 0
        ? getCachedShopCatalog(clientCatalogSignature)
        : undefined
    const cached = prefetched ?? cachedFromStore ?? null
    const cacheFresh =
      prefetched != null ||
      (cachedFromStore != null && isShopCatalogCacheFresh(clientCatalogSignature))
    const cacheHasTrustedTotal = isShopCatalogCacheTotalTrusted(cached)

    if (
      !skipCatalogClientCache &&
      cacheFresh &&
      cached &&
      cached.items.length > 0 &&
      cacheHasTrustedTotal
    ) {
      applyCatalogPage(cached)
      clearLoadingFlags()
      setError(null)
      // Search/tag totals change often — refresh count in the background.
      if (debouncedSearch.trim() || filterTag) {
        totalItemsRef.current = 0
        setTotalItems(0)
        void fetchCatalogJson(buildCatalogTotalUrl())
          .then((payload) => {
            if (cancelled) return
            if (!isCatalogProductsPage(payload)) return
            if (typeof payload.total === 'number') {
              totalItemsRef.current = payload.total
              setTotalItems(payload.total)
              patchCachedTotal(payload.total)
            }
          })
          .catch(() => undefined)
      }
      return () => {
        cancelled = true
      }
    }

    setError(null)

    const cachedHasItems = cached != null && cached.items.length > 0
    if (cachedHasItems) {
      applyCatalogPage(cached)
      setPageLoading(true)
    } else if (!hasLoadedOnce.current) {
      setLoading(true)
      setPageLoading(true)
    } else {
      setPageLoading(true)
    }

    const abortController = new AbortController()

    async function loadProducts() {
      try {
        const url = buildCatalogFetchUrl(pageToLoad, catalogPageBaseOffset(pageToLoad))
        const data: unknown = await fetchCatalogJson(url, { signal: abortController.signal })
        if (!isCatalogProductsPage(data)) throw new Error('Invalid data format returned')
        if (cancelled) return

        applyCatalogPage(data)

        // Only hit countOnly when the list payload omitted a trusted total.
        const listHasTotal =
          !data.skipTotal && typeof data.total === 'number' && data.total > 0
        if (
          !listHasTotal &&
          !catalogShuffle &&
          (pageToLoad === 1 || totalItemsRef.current <= 0 || !cacheHasTrustedTotal)
        ) {
          try {
            const payload = await fetchCatalogJson(buildCatalogTotalUrl(), {
              signal: abortController.signal,
            })
            if (cancelled) return
            if (!isCatalogProductsPage(payload)) return
            if (typeof payload.total === 'number' && payload.total > 0) {
              totalItemsRef.current = payload.total
              setTotalItems(payload.total)
              patchCachedTotal(payload.total)
            }
          } catch (err) {
            if (isCatalogFetchAbortError(err)) return
          }
        }
      } catch (err) {
        if (cancelled || isCatalogFetchAbortError(err)) return
        setError(
          `Failed to load products: ${err instanceof Error ? err.message : 'Unknown error'}`
        )
        // Keep the previous page / cached grid on transient 503s — never wipe the catalog.
        if (!cached && productsRef.current.length === 0) {
          setProducts([])
        }
      } finally {
        clearLoadingFlags()
      }
    }

    void loadProducts()
    return () => {
      cancelled = true
      abortController.abort()
      // If nothing replaced this load (unmount / stalled), drop the overlay so we
      // cannot stay stuck at 88% and keep hammering the VPS.
      queueMicrotask(() => {
        if (loadGen === catalogLoadGenRef.current) {
          setLoading(false)
          setPageLoading(false)
          setFilterNavigating(false)
        }
      })
    }
  }, [
    activeCategory,
    activeSubcategory,
    brandQueryActive,
    catalogBrowseDeferred,
    catalogMode,
    catalogNavNonce,
    catalogShuffle,
    config.mode,
    currentPage,
    debouncedSearch,
    effectiveNestedSubcategory,
    filterSignature,
    filterBrand,
    filterTag,
    // Do NOT depend on initialCatalogSignature — homepage embeds ?page= in it and
    // would abort+restart the in-flight page fetch on every Next click.
    isFeaturedOnlyHost,
    reloadToken,
    setCurrentPage,
    skipCatalogClientCache,
    buildCatalogFetchUrl,
    buildCatalogTotalUrl,
  ])

  /** Backfill total when products are visible but count was deferred (homepage shuffle, cold cache). */
  useEffect(() => {
    if (catalogBrowseDeferred || totalItems > 0 || products.length === 0) return
    if (loading || pageLoading || filterNavigating) return

    let cancelled = false
    void fetch(buildCatalogTotalUrl(), { method: 'GET' })
      .then(async (res) => {
        if (!res.ok || cancelled) return
        const payload: unknown = await res.json()
        if (!isCatalogProductsPage(payload) || cancelled) return
        if (typeof payload.total === 'number') setTotalItems(payload.total)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [
    buildCatalogTotalUrl,
    catalogBrowseDeferred,
    filterNavigating,
    filterSignature,
    loading,
    pageLoading,
    products.length,
    totalItems,
  ])

  useEffect(() => {
    if (!isAdmin || !user || catalogBrowseDeferred) {
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
      nested?: string
      brand?: string
    }): Promise<number> {
      const url = buildCatalogProductsUrl(appPath('/api/products'), {
        page: 1,
        limit: 1,
        ...params,
        mode: config.mode === 'new' ? 'new' : undefined,
        countOnly: true,
      })
      const res = await fetch(url, { method: 'GET' })
      if (!res.ok) return 0
      const data: unknown = await res.json()
      if (!isCatalogProductsPage(data)) return 0
      return data.total
    }

    const timer = window.setTimeout(() => {
      void (async function loadCounts() {
        const tasks: Promise<void>[] = []

        if (showCategory) {
          tasks.push(
            fetchCount({
              category: selectedCategory,
              subcategory: shopSubcategoryForApiQuery(selectedSubcategory),
              nested: shopNestedSubcategoryForApiQuery(selectedNestedSubcategory),
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
              subcategory: shopSubcategoryForApiQuery(selectedSubcategory),
              nested: shopNestedSubcategoryForApiQuery(selectedNestedSubcategory),
              brand: filterBrand,
            }).then((n) => {
              if (!cancelled) setBrandProductCount(n)
            })
          )
        } else if (!cancelled) {
          setBrandProductCount(null)
        }

        await Promise.all(tasks)
      })()
    }, 450)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [
    brandQueryActive,
    catalogBrowseDeferred,
    config.mode,
    filterBrand,
    isAdmin,
    reloadToken,
    selectedCategory,
    selectedNestedSubcategory,
    selectedSubcategory,
    user,
  ])

  const catalogBrowsePrompt = useMemo(() => {
    if (!catalogBrowseDeferred) return null
    if (loadingSubcategories || loadingNestedSubcategories) {
      return tr('shop.catalog.loadingSubcategories')
    }
    if (effectiveNeedsSubcategoryPick) return tr('shop.catalog.pickSubcategory')
    if (effectiveNeedsNestedSubcategoryPick) return tr('shop.catalog.pickNestedSubcategory')
    return null
  }, [
    catalogBrowseDeferred,
    effectiveNeedsNestedSubcategoryPick,
    effectiveNeedsSubcategoryPick,
    loadingNestedSubcategories,
    loadingSubcategories,
    tr,
  ])
  const showBrowsePrompt = Boolean(catalogBrowsePrompt)

  const handleCatalogLoadStall = useCallback(() => {
    // Clear the loading overlay only — do not auto-refetch / reshuffle the catalog.
    setLoading(false)
    setPageLoading(false)
    setFilterNavigating(false)
    setLoadingMore(false)
  }, [])

  const isDark = theme === 'dark'
  const EmptyIcon = config.icon ? EMPTY_ICONS[config.icon] : SparklesIcon
  const shellBg = isDark ? 'bg-dark-950' : 'bg-gray-50'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const catalogFetching =
    !catalogBrowseDeferred &&
    (loading || pageLoading || searchPending || filterNavigating)
  const showCatalogLoadingOverlay =
    !catalogBrowseDeferred && !showBrowsePrompt && catalogFetching

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
          className={`relative flex-1 p-4 sm:p-6 overflow-x-hidden transition-colors duration-200 app-readable ${shellBg}`}
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
                displayCategory={optimisticCategory ?? undefined}
                onCategoryChange={handleCategoryChange}
                onCategoryHover={(category) => {
                  if (category === 'All') return
                  prefetchShopSubcategories(category)
                  if (!categoryHasBrowseChildren(category)) {
                    prefetchShopCatalogFilter({
                      page: 1,
                      category,
                      mode: catalogMode,
                    })
                  }
                }}
                centered={config.centerCatalog}
              />
              <SubcategoryFilter
                selectedCategory={activeCategory}
                displaySubcategory={optimisticSubcategory ?? undefined}
                onSubcategoryChange={handleSubcategoryChange}
                onSubcategoryHover={(subcategory) =>
                  prefetchCatalogHover({
                    subcategory: subcategory !== 'All' ? subcategory : undefined,
                    nested: undefined,
                    brand: undefined,
                  })
                }
                centered={config.centerCatalog}
                subcategoryState={subcategoryState}
              />
              <SubcategoryFilter
                selectedCategory={activeSubcategory}
                displaySubcategory={optimisticNestedSubcategory ?? undefined}
                onSubcategoryChange={handleNestedSubcategoryChange}
                onSubcategoryHover={(nested) =>
                  prefetchCatalogHover({
                    nested: nested !== 'All' ? nested : undefined,
                    brand: undefined,
                  })
                }
                centered={config.centerCatalog}
                subcategoryState={nestedPillState}
                ariaLabel="Nested subcategories"
              />
              <BrandFilter
                selectedCategory={activeCategory}
                selectedBrand={selectedBrand}
                displayBrand={optimisticBrand ?? undefined}
                onBrandChange={handleBrandChange}
                browseSubcategory={activeSubcategory}
                browseNested={effectiveNestedSubcategory}
                onBrandHover={(brand) =>
                  prefetchCatalogHover({
                    brand: brand !== 'All' ? brand : undefined,
                  })
                }
                centered={config.centerCatalog}
                subcategoryState={subcategoryState}
                nestedSubcategoryState={nestedSubcategoryState}
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

            {showBrowsePrompt ? (
              <div
                className={`text-center py-16 rounded-xl border ${
                  isDark ? 'border-dark-800 bg-dark-900' : 'border-gray-200 bg-white'
                }`}
              >
                <h2
                  className={`text-xl font-semibold mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {catalogBrowsePrompt}
                </h2>
                <p className={`${muted} max-w-md mx-auto`}>
                  {tr('shop.catalog.pickSubcategoryHint')}
                </p>
              </div>
            ) : showCatalogLoadingOverlay ? (
              null
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
            ) : products.length === 0 && !catalogFetching ? (
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
                onPageChange={handlePageChange}
                onBeyondLastPage={isFeaturedOnlyHost ? openFullCatalogModal : undefined}
                onProductDeleted={handleProductDeleted}
                onProductUnavailable={handleProductUnavailable}
                onProductQuickEditSaved={handleProductQuickEditSaved}
                onProductFeaturedSaved={handleProductFeaturedSaved}
                onReorder={isAdmin ? handleReorder : undefined}
                reorderScope={isAdmin ? reorderScope : null}
                reorderSaving={reorderSaving}
                centered={config.centerCatalog}
                hasMoreOnPage={hasMoreOnPage}
                loadingMore={loadingMore}
                onLoadMore={() => void loadMoreProducts()}
                searchQuery={debouncedSearch}
                countPending={Boolean(debouncedSearch.trim()) && totalItems <= 0 && products.length > 0}
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

      <CatalogLoadingOverlay
        active={showCatalogLoadingOverlay}
        onStall={handleCatalogLoadStall}
      />

      <FeaturedCatalogExhaustedModal
        open={showFullCatalogModal}
        fullCatalogTotal={fullCatalogTotal}
        onClose={() => setShowFullCatalogModal(false)}
      />
    </div>
  )
}

export default function ShopCatalogPage({
  config,
  initialCatalog,
  initialCatalogSignature,
  initialCategoryNav,
}: {
  config: ShopCatalogConfig
  initialCatalog?: CatalogProductsPage | null
  initialCatalogSignature?: string
  initialCategoryNav?: ShopCategoryNavNode[] | null
}) {
  return (
    <Suspense fallback={null}>
      <ShopCatalogPageContent
        config={config}
        initialCatalog={initialCatalog}
        initialCatalogSignature={initialCatalogSignature}
        initialCategoryNav={initialCategoryNav}
      />
    </Suspense>
  )
}
