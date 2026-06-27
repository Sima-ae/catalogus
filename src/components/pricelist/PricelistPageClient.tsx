'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PricelistRow } from '@/lib/pricelist-db'
import { useSearchParams, useRouter } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth-local'
import { usePricelist } from '@/lib/use-pricelist'
import {
  PRICELIST_OWNER_QUERY_PLATFORM,
  PRICELIST_PAGE_SIZE,
  PRICELIST_PAGE_SIZES,
  type PricelistPageSize,
} from '@/lib/pricelist-constants'
import PricelistViewToggle from '@/components/pricelist/PricelistViewToggle'
import PricelistTable from '@/components/pricelist/PricelistTable'
import PricelistGrid from '@/components/pricelist/PricelistGrid'
import PricelistProductLightbox from '@/components/pricelist/PricelistProductLightbox'
import PricelistSharePasswordSettings from '@/components/pricelist/PricelistSharePasswordSettings'
import CatalogLoadingIndicator from '@/components/shop/CatalogLoadingIndicator'
import CatalogPagination from '@/components/shop/CatalogPagination'
import AppFooter from '@/components/layout/AppFooter'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import { useI18n } from '@/lib/i18n-context'
import { translatePricelistOwnerLabel } from '@/lib/i18n-pricelist'
import {
  isPricelistRowBulkEditable,
  isPricelistRowBulkEditableShipping,
  isPricelistRowBulkSelectable,
} from '@/lib/pricelist-filters'
import PricelistCatalogFilters from '@/components/pricelist/PricelistCatalogFilters'
import PricelistBulkActionsBar from '@/components/pricelist/PricelistBulkActionsBar'
import PricelistBulkPriceModal from '@/components/pricelist/PricelistBulkPriceModal'
import type { PricelistBulkFilterScope, PricelistBulkItem } from '@/lib/use-pricelist'
import { formatMessage } from '@/lib/i18n'
import PricelistFilterToggleButton from '@/components/pricelist/PricelistFilterToggleButton'
import PricelistExportButton from '@/components/pricelist/PricelistExportButton'
import { useShopCategory } from '@/lib/use-shop-category'
import { useShopSubcategory } from '@/lib/use-shop-subcategory'
import { useShopBrand } from '@/lib/use-shop-brand'
import { shouldApplyShopBrandFilter } from '@/lib/shop-brand-menu'
import type { PricelistListQuery } from '@/lib/use-pricelist'
import { appPath } from '@/lib/paths'

type PricelistQuickFilter = 'missing' | 'all' | 'filled' | 'outOfStock'
type BulkSelectionScope = 'explicit' | 'filtered' | 'allMissing'

export default function PricelistPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialOwner = searchParams.get('owner') || undefined
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { t } = useI18n()

  const { user, isSuperAdmin } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const { selectedCategory } = useShopCategory()
  const subcategoryState = useShopSubcategory(selectedCategory)
  const { selectedSubcategory, hasSubcategories, loadingSubcategories } = subcategoryState
  const { selectedBrand } = useShopBrand({ selectedCategory, subcategoryState })
  const filterBrand = selectedBrand
  const brandFilterCtx = {
    selectedCategory,
    selectedSubcategory,
    hasSubcategories,
    loadingSubcategories,
  }
  const brandFilterActive = shouldApplyShopBrandFilter(filterBrand, brandFilterCtx)
  const [quickFilter, setQuickFilter] = useState<PricelistQuickFilter>('missing')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<PricelistPageSize>(PRICELIST_PAGE_SIZE)

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => window.clearTimeout(id)
  }, [searchQuery])

  const listQuery = useMemo((): PricelistListQuery => {
    return {
      page: currentPage,
      limit: pageSize,
      search: debouncedSearch.trim() || undefined,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      subcategory: selectedSubcategory !== 'All' ? selectedSubcategory : undefined,
      brand: brandFilterActive && filterBrand !== 'All' ? filterBrand : undefined,
      missingPricesOnly: quickFilter === 'missing',
      filledPricesOnly: quickFilter === 'filled',
      outOfStockOnly: quickFilter === 'outOfStock',
    }
  }, [
    brandFilterActive,
    currentPage,
    debouncedSearch,
    filterBrand,
    pageSize,
    selectedCategory,
    selectedSubcategory,
    quickFilter,
  ])

  const {
    owners,
    ownerId,
    setOwnerId,
    items,
    total,
    totalOnPricelist,
    totalPages,
    missingPriceCount,
    exportFilledCount,
    outOfStockCount,
    loading,
    pageLoading,
    error,
    viewMode,
    setViewMode,
    savePrice,
    saveShipping,
    setStockStatus,
    clearPrice,
    clearShipping,
    requestPriceEdit,
    approvePriceEdit,
    removeItem,
    bulkRemove,
    bulkUpdate,
    fetchSelectionProductIds,
    canEditPrices,
    currentOwnerLabel,
    isGuest,
    isSeller,
    fetchExportItems,
  } = usePricelist(initialOwner, listQuery)

  const ownerQuery = ownerId

  const currentOwner = owners.find((o) => o.id === ownerId)
  const isCuratedList = currentOwner?.kind === 'platform'

  const isAdmin = user?.role === 'admin'
  const canRemoveItems =
    !isGuest && Boolean(user) && (Boolean(isSuperAdmin) || isAdmin)
  const canManagePriceEditRequests = isAdmin && isCuratedList && !isGuest

  const listOwnerIdForShare = ownerQuery

  const canManageSharePassword =
    !isGuest && Boolean(user) && isSuperAdmin && isCuratedList

  const heading = isDark ? 'text-white' : 'text-gray-900'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const selectClass = isDark
    ? 'bg-dark-800 border-dark-600 text-white'
    : 'bg-white border-gray-300 text-gray-900'

  const showOwnerSelect = owners.length > 1
  const [lightbox, setLightbox] = useState<{
    name: string
    images: string[]
    initialIndex: number
  } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)
  const [selectionLoading, setSelectionLoading] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false)
  const [bulkShippingOpen, setBulkShippingOpen] = useState(false)
  const preserveSelectionRef = useRef(false)
  const [bulkSelectionScope, setBulkSelectionScope] = useState<BulkSelectionScope>('explicit')

  const openGallery = useCallback((row: PricelistRow) => {
    const images = row.gallery_urls?.length ? row.gallery_urls : row.image_url ? [row.image_url] : []
    if (!images.length) return
    setLightbox({ name: row.name, images, initialIndex: 0 })
  }, [])

  const subtitle = isCuratedList
    ? owners.find((o) => o.id === ownerId)?.label || t('pricelist.subtitle.platform')
    : translatePricelistOwnerLabel(
        owners.find((o) => o.id === ownerId) ?? { label: currentOwnerLabel },
        t
      )

  const guestShareLink = isGuest && Boolean(searchParams.get('owner'))

  const hasActiveFilters = Boolean(
    selectedCategory !== 'All' ||
      selectedSubcategory !== 'All' ||
      (brandFilterActive && filterBrand !== 'All') ||
      quickFilter !== 'missing'
  )

  /** Share-link guests (after pricelist password) can filter missing prices too. */
  const showMissingPricesButton = canEditPrices && viewMode === 'table'
  const enableBulkSelect = canEditPrices && viewMode === 'table'
  const canExportPricelist = !isGuest && Boolean(user) && (Boolean(isSuperAdmin) || isAdmin)
  const showExportButton = canExportPricelist && viewMode === 'table'
  const showAdminPriceFilters =
    !isGuest && Boolean(user) && (Boolean(isSuperAdmin) || isAdmin) && viewMode === 'table'
  /** Share-link suppliers (guest + platform pricelist) can filter out-of-stock items. */
  const showOutOfStockFilter =
    showMissingPricesButton && (showAdminPriceFilters || (isGuest && isCuratedList))

  const exportOwnerLabel = translatePricelistOwnerLabel(
    owners.find((o) => o.id === ownerId) ?? {
      label: currentOwnerLabel,
      kind: currentOwner?.kind,
    },
    t
  )

  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  useEffect(() => {
    setCurrentPage(1)
  }, [
    debouncedSearch,
    ownerId,
    selectedCategory,
    selectedSubcategory,
    filterBrand,
    brandFilterActive,
    quickFilter,
    pageSize,
  ])

  useEffect(() => {
    if (preserveSelectionRef.current) {
      preserveSelectionRef.current = false
      return
    }
    setSelectedIds(new Set())
    setBulkSelectionScope('explicit')
    setBulkMessage(null)
  }, [
    ownerId,
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    filterBrand,
    brandFilterActive,
    quickFilter,
  ])

  useEffect(() => {
    setQuickFilter('missing')
  }, [ownerId])

  useEffect(() => {
    if (!showAdminPriceFilters && quickFilter === 'filled') {
      setQuickFilter('missing')
    }
  }, [showAdminPriceFilters, quickFilter])

  useEffect(() => {
    if (!showOutOfStockFilter && quickFilter === 'outOfStock') {
      setQuickFilter('missing')
    }
  }, [showOutOfStockFilter, quickFilter])

  useEffect(() => {
    setSearchQuery('')
    setDebouncedSearch('')
  }, [selectedCategory, selectedSubcategory, filterBrand])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const selectableOnPage = useMemo(
    () => items.filter((row) => isPricelistRowBulkSelectable(row, { isSeller })),
    [items, isSeller]
  )

  const rowByProductId = useMemo(
    () => new Map(items.map((row) => [row.product_id, row])),
    [items]
  )

  const allOnPageSelected =
    selectableOnPage.length > 0 &&
    selectableOnPage.every((row) => selectedIds.has(row.product_id))
  const someOnPageSelected = selectableOnPage.some((row) => selectedIds.has(row.product_id))
  const allFilteredSelected = total > 0 && selectedIds.size >= total

  const bulkFilterScope = useMemo((): PricelistBulkFilterScope | undefined => {
    if (!allFilteredSelected) return undefined
    return {
      search: listQuery.search,
      category: listQuery.category,
      subcategory: listQuery.subcategory,
      brand: listQuery.brand,
      missingPricesOnly: listQuery.missingPricesOnly,
      filledPricesOnly: listQuery.filledPricesOnly,
      outOfStockOnly: listQuery.outOfStockOnly,
    }
  }, [allFilteredSelected, listQuery])

  const resolveBulkApplyToFilters = useCallback((): PricelistBulkFilterScope | undefined => {
    if (bulkSelectionScope === 'allMissing') {
      return { missingPricesOnly: true }
    }
    if (bulkSelectionScope === 'filtered' && bulkFilterScope) {
      return bulkFilterScope
    }
    return undefined
  }, [bulkSelectionScope, bulkFilterScope])

  const toBulkItems = (productIds: Iterable<string>): PricelistBulkItem[] =>
    Array.from(productIds).map((productId) => ({ productId }))

  const selectedProductIdsForBulkPrice = useMemo(() => {
    const ids: string[] = []
    for (const productId of Array.from(selectedIds)) {
      const row = rowByProductId.get(productId)
      if (!row || isPricelistRowBulkEditable(row, { isSeller })) ids.push(productId)
    }
    return ids
  }, [selectedIds, rowByProductId, isSeller])

  const selectedProductIdsForBulkShipping = useMemo(() => {
    const ids: string[] = []
    for (const productId of Array.from(selectedIds)) {
      const row = rowByProductId.get(productId)
      if (!row || isPricelistRowBulkEditableShipping(row, { isSeller })) ids.push(productId)
    }
    return ids
  }, [selectedIds, rowByProductId, isSeller])

  const bulkPriceTargetIds = isSeller ? selectedProductIdsForBulkPrice : Array.from(selectedIds)
  const bulkShippingTargetIds = isSeller
    ? selectedProductIdsForBulkShipping
    : Array.from(selectedIds)

  const toggleSelect = (productId: string) => {
    setBulkSelectionScope('explicit')
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const toggleSelectAllPage = () => {
    setBulkSelectionScope('explicit')
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        for (const row of selectableOnPage) next.delete(row.product_id)
      } else {
        for (const row of selectableOnPage) next.add(row.product_id)
      }
      return next
    })
  }

  const selectAllFiltered = async () => {
    setSelectionLoading(true)
    setBulkMessage(null)
    try {
      const productIds = await fetchSelectionProductIds('filtered')
      setBulkSelectionScope('filtered')
      setSelectedIds(new Set(productIds))
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : t('pricelist.bulk.failed'))
    } finally {
      setSelectionLoading(false)
    }
  }

  const selectAllMissing = async () => {
    setSelectionLoading(true)
    setBulkMessage(null)
    try {
      const productIds = await fetchSelectionProductIds('allMissing')
      setBulkSelectionScope('allMissing')
      preserveSelectionRef.current = true
      setSelectedIds(new Set(productIds))
      if (quickFilter !== 'missing' && productIds.length > 0) {
        setQuickFilter('missing')
      }
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : t('pricelist.bulk.failed'))
    } finally {
      setSelectionLoading(false)
    }
  }

  const runBulkStockStatus = async (stockStatus: 'out' | 'temporary') => {
    const applyToFilters = resolveBulkApplyToFilters()
    if (!selectedIds.size && !applyToFilters) return
    setBulkWorking(true)
    setBulkMessage(null)
    try {
      const result = await bulkUpdate(
        'stockStatus',
        applyToFilters ? [] : toBulkItems(selectedIds),
        { stockStatus, applyToFilters }
      )
      setSelectedIds(new Set())
      if (result.skipped > 0) {
        setBulkMessage(
          formatMessage(t('pricelist.bulk.partial'), {
            updated: result.updated,
            skipped: result.skipped,
          })
        )
      } else {
        setBulkMessage(formatMessage(t('pricelist.bulk.done'), { count: result.updated }))
      }
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : t('pricelist.bulk.failed'))
    } finally {
      setBulkWorking(false)
    }
  }

  const runBulkPrice = async (unitPrice: number) => {
    const applyToFilters = resolveBulkApplyToFilters()
    if (!bulkPriceTargetIds.length && !applyToFilters) return
    setBulkWorking(true)
    setBulkMessage(null)
    try {
      const result = await bulkUpdate(
        'price',
        applyToFilters ? [] : toBulkItems(bulkPriceTargetIds),
        { unitPrice, applyToFilters }
      )
      setBulkPriceOpen(false)
      setSelectedIds(new Set())
      if (result.skipped > 0) {
        setBulkMessage(
          formatMessage(t('pricelist.bulk.partial'), {
            updated: result.updated,
            skipped: result.skipped,
          })
        )
      } else {
        setBulkMessage(formatMessage(t('pricelist.bulk.done'), { count: result.updated }))
      }
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : t('pricelist.bulk.failed'))
    } finally {
      setBulkWorking(false)
    }
  }

  const runBulkShipping = async (shippingCost: number) => {
    const applyToFilters = resolveBulkApplyToFilters()
    if (!bulkShippingTargetIds.length && !applyToFilters) return
    setBulkWorking(true)
    setBulkMessage(null)
    try {
      const result = await bulkUpdate(
        'shipping',
        applyToFilters ? [] : toBulkItems(bulkShippingTargetIds),
        { shippingCost, applyToFilters }
      )
      setBulkShippingOpen(false)
      setSelectedIds(new Set())
      if (result.skipped > 0) {
        setBulkMessage(
          formatMessage(t('pricelist.bulk.partial'), {
            updated: result.updated,
            skipped: result.skipped,
          })
        )
      } else {
        setBulkMessage(formatMessage(t('pricelist.bulk.done'), { count: result.updated }))
      }
    } catch (e) {
      setBulkMessage(e instanceof Error ? e.message : t('pricelist.bulk.failed'))
    } finally {
      setBulkWorking(false)
    }
  }

  const runBulkRemove = async () => {
    const applyToFilters = resolveBulkApplyToFilters()
    const count = applyToFilters
      ? bulkSelectionScope === 'allMissing'
        ? missingPriceCount
        : total
      : selectedIds.size
    if (!count) return
    if (
      !window.confirm(formatMessage(t('pricelist.bulk.deleteConfirm'), { count }))
    ) {
      return
    }
    setBulkWorking(true)
    setBulkMessage(null)
    try {
      const result = await bulkRemove(
        applyToFilters ? [] : toBulkItems(selectedIds),
        applyToFilters
      )
      setSelectedIds(new Set())
      if (result.failed > 0) {
        setBulkMessage(
          formatMessage(t('pricelist.bulk.partial'), {
            updated: result.removed,
            skipped: result.failed,
          })
        )
      } else {
        setBulkMessage(formatMessage(t('pricelist.bulk.removed'), { count: result.removed }))
      }
    } catch (e) {
      setBulkMessage(
        e instanceof Error ? e.message : t('pricelist.bulk.removeFailed')
      )
    } finally {
      setBulkWorking(false)
    }
  }

  const missingPricesTrailing =
    showMissingPricesButton || showExportButton || total > 0 ? (
      <div className="flex shrink-0 flex-nowrap items-center gap-1">
        <label className="flex items-center gap-1">
          <span className={`sr-only sm:not-sr-only sm:text-[11px] ${muted}`}>
            {t('admin.products.perPage')}
          </span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) as PricelistPageSize)}
            className={`rounded-lg border px-1.5 py-0.5 text-[11px] leading-tight ${selectClass}`}
            aria-label={t('admin.products.perPage')}
          >
            {PRICELIST_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {showExportButton ? (
          <PricelistExportButton
            fetchItems={fetchExportItems}
            ownerLabel={exportOwnerLabel}
            disabled={exportFilledCount === 0}
            compact
            className="btn-secondary text-[11px] leading-tight px-1.5 py-0.5"
          />
        ) : null}
        {showMissingPricesButton ? (
          <>
            <PricelistFilterToggleButton
              active={quickFilter === 'missing'}
              count={missingPriceCount}
              onToggle={() =>
                setQuickFilter((current) => (current === 'missing' ? 'all' : 'missing'))
              }
              inactiveLabelKey="pricelist.filter.showMissingPrices"
            />
            {showAdminPriceFilters ? (
              <PricelistFilterToggleButton
                active={quickFilter === 'filled'}
                count={exportFilledCount}
                onToggle={() =>
                  setQuickFilter((current) => (current === 'filled' ? 'all' : 'filled'))
                }
                inactiveLabelKey="pricelist.filter.showWithPrices"
              />
            ) : null}
            {showOutOfStockFilter ? (
              <PricelistFilterToggleButton
                active={quickFilter === 'outOfStock'}
                count={outOfStockCount}
                onToggle={() =>
                  setQuickFilter((current) => (current === 'outOfStock' ? 'all' : 'outOfStock'))
                }
                inactiveLabelKey="pricelist.filter.showOutOfStock"
              />
            ) : null}
          </>
        ) : null}
      </div>
    ) : null

  const paginationProps = {
    page: safePage,
    totalItems: total,
    pageSize,
    onPageChange: setCurrentPage,
    centered: true,
    compact: true,
    trailing: missingPricesTrailing,
  }

  const searchInputClass = isDark
    ? 'bg-dark-800 border-dark-600 text-white placeholder-gray-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'

  return (
    <div className="w-full max-w-[min(100%,90rem)] mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="shrink-0 lg:min-w-[10rem]">
          <h1 className={`text-2xl font-bold ${heading}`}>{t('pricelist.title')}</h1>
          <p className={`mt-1 text-sm ${muted}`}>{subtitle}</p>
        </div>

        <div className="relative flex-1 w-full min-w-0 max-w-xl mx-auto">
          <MagnifyingGlassIcon
            className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${muted}`}
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('pricelist.search.placeholder')}
            className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${searchInputClass}`}
            aria-label={t('pricelist.search.aria')}
          />
        </div>

        <div className="flex flex-nowrap items-center justify-end gap-2 sm:gap-3 shrink-0 lg:min-w-[12rem]">
          {showOwnerSelect ? (
            <select
              value={ownerId}
              onChange={(e) => {
                const next = e.target.value
                setOwnerId(next)
                const params = new URLSearchParams(searchParams.toString())
                params.set('owner', next)
                router.replace(`${appPath('/pricelist')}?${params.toString()}`)
              }}
              className={`rounded-lg border px-3 py-2 text-sm min-w-[8rem] sm:min-w-[12rem] max-w-full ${selectClass}`}
              aria-label={t('pricelist.selectOwner.aria')}
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {translatePricelistOwnerLabel(o, t)}
                </option>
              ))}
            </select>
          ) : null}
          <PricelistViewToggle mode={viewMode} onChange={setViewMode} isDark={isDark} t={t} />
          <LanguageSwitcher compact />
        </div>
      </div>

      {isGuest ? (
        <div className={`text-sm ${muted}`}>
          <p>{t('pricelist.guest.line1')}</p>
          <p className="mt-1 text-xs text-red-500">{t('pricelist.guest.line2')}</p>
        </div>
      ) : null}

      {canManageSharePassword && listOwnerIdForShare ? (
        <PricelistSharePasswordSettings
          ownerId={listOwnerIdForShare}
          ownerQuery={ownerQuery}
        />
      ) : null}

      {error ? (
        <p className="text-red-500 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {bulkMessage ? (
        <p className={`text-sm ${muted}`} role="status">
          {bulkMessage}
        </p>
      ) : null}

      {!loading && (totalOnPricelist > 0 || hasActiveFilters) ? (
        <PricelistCatalogFilters subcategoryState={subcategoryState} />
      ) : null}

      {loading ? (
        <CatalogLoadingIndicator compact message={t('loading.pricelist')} isDark={isDark} />
      ) : totalOnPricelist === 0 ? (
        <div
          className={`text-center py-16 rounded-xl border ${
            isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
          }`}
        >
          <p className={muted}>{t('pricelist.empty.none')}</p>
          <p className={`text-sm mt-2 ${muted}`}>{t('pricelist.empty.starHint')}</p>
        </div>
      ) : total === 0 && quickFilter === 'missing' && !hasActiveFilters ? (
        <div
          className={`text-center py-16 rounded-xl border ${
            isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
          }`}
        >
          <p className={muted}>{t('pricelist.empty.missingPrices')}</p>
          {showMissingPricesButton ? (
            <button
              type="button"
              className="btn-secondary mt-4 text-sm"
              onClick={() => setQuickFilter('all')}
            >
              {t('pricelist.filter.showAllProducts')}
            </button>
          ) : null}
        </div>
      ) : total === 0 ? (
        <div
          className={`text-center py-16 rounded-xl border ${
            isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
          }`}
        >
          <p className={muted}>
            {debouncedSearch.trim()
              ? t('pricelist.empty.search')
              : hasActiveFilters
                ? t('pricelist.empty.filters')
                : t('pricelist.empty.missingPrices')}
          </p>
          {quickFilter === 'missing' && showMissingPricesButton ? (
            <button
              type="button"
              className="btn-secondary mt-4 text-sm"
              onClick={() => setQuickFilter('all')}
            >
              {t('pricelist.filter.showAllProducts')}
            </button>
          ) : null}
        </div>
      ) : pageLoading ? (
        <CatalogLoadingIndicator message={t('loading.products')} isDark={isDark} />
      ) : viewMode === 'table' ? (
        <>
          <CatalogPagination {...paginationProps} />
          {enableBulkSelect ? (
            <PricelistBulkActionsBar
              selectedCount={selectedIds.size}
              filteredCount={total}
              missingCount={missingPriceCount}
              allOnPageSelected={allOnPageSelected}
              allFilteredSelected={allFilteredSelected}
              busy={bulkWorking || selectionLoading}
              isDark={isDark}
              onSelectAllPage={toggleSelectAllPage}
              onSelectAllFiltered={selectAllFiltered}
              onSelectAllMissing={selectAllMissing}
              onClearSelection={() => setSelectedIds(new Set())}
              onSetOutOfStock={() => void runBulkStockStatus('out')}
              onSetTemporarilyOutOfStock={() => void runBulkStockStatus('temporary')}
              onOpenSetPrice={() => setBulkPriceOpen(true)}
              onOpenSetShipping={() => setBulkShippingOpen(true)}
              showDelete={canRemoveItems}
              onDelete={() => void runBulkRemove()}
            />
          ) : null}
          <PricelistTable
            items={items}
            enableBulkSelect={enableBulkSelect}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAllPage={toggleSelectAllPage}
            allOnPageSelected={allOnPageSelected}
            someOnPageSelected={someOnPageSelected}
            canEditPrices={canEditPrices}
            canManageItems={canRemoveItems}
            showStar={false}
            ownerQuery={ownerQuery}
            isDark={isDark}
            isSeller={isSeller}
            canApprovePriceEdits={canManagePriceEditRequests}
            canClearPrice={Boolean(isSuperAdmin)}
            onSavePrice={savePrice}
            onSaveShipping={saveShipping}
            onSetStockStatus={setStockStatus}
            onClearPrice={isSuperAdmin ? clearPrice : undefined}
            onClearShipping={isSuperAdmin ? clearShipping : undefined}
            onRequestPriceEdit={isSeller ? requestPriceEdit : undefined}
            onApprovePriceEdit={canManagePriceEditRequests ? approvePriceEdit : undefined}
            onRemove={removeItem}
            onOpenGallery={openGallery}
          />
          <CatalogPagination {...paginationProps} />
          <AppFooter />
        </>
      ) : (
        <>
          <CatalogPagination {...paginationProps} />
          <PricelistGrid items={items} isDark={isDark} onOpenGallery={openGallery} />
          <CatalogPagination {...paginationProps} />
          <AppFooter />
        </>
      )}

      <PricelistBulkPriceModal
        open={bulkPriceOpen}
        count={resolveBulkApplyToFilters() ? (bulkSelectionScope === 'allMissing' ? missingPriceCount : total) : bulkPriceTargetIds.length}
        busy={bulkWorking}
        onClose={() => setBulkPriceOpen(false)}
        onApply={runBulkPrice}
      />

      <PricelistBulkPriceModal
        open={bulkShippingOpen}
        variant="shipping"
        count={resolveBulkApplyToFilters() ? (bulkSelectionScope === 'allMissing' ? missingPriceCount : total) : bulkShippingTargetIds.length}
        busy={bulkWorking}
        onClose={() => setBulkShippingOpen(false)}
        onApply={runBulkShipping}
      />

      <PricelistProductLightbox
        open={lightbox != null}
        productName={lightbox?.name ?? ''}
        images={lightbox?.images ?? []}
        initialIndex={lightbox?.initialIndex ?? 0}
        onClose={() => setLightbox(null)}
      />
    </div>
  )
}
