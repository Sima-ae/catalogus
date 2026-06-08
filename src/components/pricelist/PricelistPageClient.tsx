'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PricelistRow } from '@/lib/pricelist-db'
import { useSearchParams } from 'next/navigation'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth-local'
import { usePricelist } from '@/lib/use-pricelist'
import {
  isPlatformPricelistOwner,
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
  PRICELIST_PAGE_SIZE,
} from '@/lib/pricelist-constants'
import PricelistViewToggle from '@/components/pricelist/PricelistViewToggle'
import PricelistTable from '@/components/pricelist/PricelistTable'
import PricelistGrid from '@/components/pricelist/PricelistGrid'
import PricelistProductLightbox from '@/components/pricelist/PricelistProductLightbox'
import PricelistSharePasswordSettings from '@/components/pricelist/PricelistSharePasswordSettings'
import CatalogPagination from '@/components/shop/CatalogPagination'
import AppFooter from '@/components/layout/AppFooter'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
import { useI18n } from '@/lib/i18n-context'
import { translatePricelistOwnerLabel } from '@/lib/i18n-pricelist'
import {
  countPricelistRowsNeedingPrice,
  countPricelistRowsWithFilledPrice,
  filterPricelistRows,
  isPricelistRowBulkEditable,
  pricelistRowNeedsPrice,
} from '@/lib/pricelist-filters'
import PricelistCatalogFilters from '@/components/pricelist/PricelistCatalogFilters'
import PricelistBulkActionsBar from '@/components/pricelist/PricelistBulkActionsBar'
import PricelistBulkPriceModal from '@/components/pricelist/PricelistBulkPriceModal'
import type { PricelistBulkItem } from '@/lib/use-pricelist'
import { formatMessage } from '@/lib/i18n'
import PricelistMissingPricesButton from '@/components/pricelist/PricelistMissingPricesButton'
import PricelistExportButton from '@/components/pricelist/PricelistExportButton'
import { useShopCategory } from '@/lib/use-shop-category'
import { useShopSubcategory } from '@/lib/use-shop-subcategory'
import { useShopBrand } from '@/lib/use-shop-brand'
import { useShopCategories } from '@/lib/use-shop-categories'
import { resolveShopCategoryFilter } from '@/lib/shop-category-tree'
import { shouldApplyShopBrandFilter } from '@/lib/shop-brand-menu'

export default function PricelistPageClient() {
  const searchParams = useSearchParams()
  const initialOwner = searchParams.get('owner') || undefined
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { t } = useI18n()

  const { user, isSuperAdmin } = useAuth()
  const {
    owners,
    ownerId,
    setOwnerId,
    items,
    loading,
    error,
    viewMode,
    setViewMode,
    savePrice,
    setStockStatus,
    clearPrice,
    requestPriceEdit,
    approvePriceEdit,
    removeItem,
    bulkUpdate,
    canEditPrices,
    currentOwnerLabel,
    isGuest,
    isSeller,
  } = usePricelist(initialOwner)

  const ownerQuery =
    ownerId === PRICELIST_OWNER_QUERY_PLATFORM || ownerId === PLATFORM_PRICELIST_OWNER_ID
      ? PRICELIST_OWNER_QUERY_PLATFORM
      : ownerId

  const canRemoveItems = Boolean(isSuperAdmin) && !isGuest

  const isPlatformList =
    ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM || ownerId === PLATFORM_PRICELIST_OWNER_ID

  const isAdmin = user?.role === 'admin'
  const canManagePriceEditRequests = isAdmin && isPlatformList && !isGuest

  const listOwnerIdForShare =
    ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM || ownerId === PLATFORM_PRICELIST_OWNER_ID
      ? PLATFORM_PRICELIST_OWNER_ID
      : ownerId

  const canManageSharePassword =
    !isGuest &&
    Boolean(user) &&
    (isPlatformPricelistOwner(listOwnerIdForShare)
      ? isSuperAdmin
      : listOwnerIdForShare === user?.id)

  const heading = isDark ? 'text-white' : 'text-gray-900'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const selectClass = isDark
    ? 'bg-dark-800 border-dark-600 text-white'
    : 'bg-white border-gray-300 text-gray-900'

  const showOwnerSelect = owners.length > 1
  const [searchQuery, setSearchQuery] = useState('')
  const { selectedCategory } = useShopCategory()
  const categoryRows = useShopCategories()
  const { selectedSubcategory, hasSubcategories, loadingSubcategories } =
    useShopSubcategory(selectedCategory)
  const { selectedBrand } = useShopBrand()
  const filterBrand = selectedBrand
  const brandFilterCtx = {
    selectedCategory,
    selectedSubcategory,
    hasSubcategories,
    loadingSubcategories,
  }
  const brandFilterActive = shouldApplyShopBrandFilter(filterBrand, brandFilterCtx)
  const [showMissingPricesOnly, setShowMissingPricesOnly] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [lightbox, setLightbox] = useState<{
    name: string
    images: string[]
    initialIndex: number
  } | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)
  const [bulkMessage, setBulkMessage] = useState<string | null>(null)
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false)

  const openGallery = useCallback((row: PricelistRow) => {
    const images = row.gallery_urls?.length ? row.gallery_urls : row.image_url ? [row.image_url] : []
    if (!images.length) return
    setLightbox({ name: row.name, images, initialIndex: 0 })
  }, [])

  const subtitle = isPlatformList
    ? t('pricelist.subtitle.platform')
    : translatePricelistOwnerLabel(
        owners.find((o) => o.id === ownerId) ?? { label: currentOwnerLabel },
        t
      )

  const guestShareLink = isGuest && Boolean(searchParams.get('owner'))

  const shopCategoryFilter = useMemo(() => {
    if (selectedCategory === 'All') return undefined
    if (!categoryRows.length) return null
    return (
      resolveShopCategoryFilter(categoryRows, {
        category: selectedCategory,
        subcategory: selectedSubcategory !== 'All' ? selectedSubcategory : undefined,
      }) ?? { categoryIds: [], legacyNames: [], strictIdOnly: true }
    )
  }, [categoryRows, selectedCategory, selectedSubcategory])

  const filterParams = useMemo(
    () => ({
      searchQuery,
      categoryFilter: selectedCategory !== 'All' ? selectedCategory : undefined,
      subcategoryFilter:
        selectedSubcategory !== 'All' ? selectedSubcategory : undefined,
      shopCategoryFilter,
      brandFilter: brandFilterActive && filterBrand !== 'All' ? filterBrand : undefined,
      missingPricesOnly: showMissingPricesOnly,
      guestShareLink,
    }),
    [
      brandFilterActive,
      filterBrand,
      guestShareLink,
      searchQuery,
      selectedCategory,
      selectedSubcategory,
      shopCategoryFilter,
      showMissingPricesOnly,
    ]
  )

  const exportFilterParams = useMemo(
    () => ({
      searchQuery,
      categoryFilter: selectedCategory !== 'All' ? selectedCategory : undefined,
      subcategoryFilter:
        selectedSubcategory !== 'All' ? selectedSubcategory : undefined,
      shopCategoryFilter,
      brandFilter: brandFilterActive && filterBrand !== 'All' ? filterBrand : undefined,
      guestShareLink,
    }),
    [
      brandFilterActive,
      filterBrand,
      guestShareLink,
      searchQuery,
      selectedCategory,
      selectedSubcategory,
      shopCategoryFilter,
    ]
  )

  const scopedItems = useMemo(
    () =>
      filterPricelistRows(items, {
        ...exportFilterParams,
      }),
    [items, exportFilterParams]
  )

  const missingPriceCount = useMemo(
    () => countPricelistRowsNeedingPrice(items, { guestShareLink }),
    [items, guestShareLink]
  )

  const filteredItems = useMemo(
    () => filterPricelistRows(items, filterParams),
    [items, filterParams]
  )

  const exportScopeItems = useMemo(
    () => filterPricelistRows(items, exportFilterParams),
    [items, exportFilterParams]
  )

  const filledPriceExportCount = useMemo(
    () => countPricelistRowsWithFilledPrice(exportScopeItems),
    [exportScopeItems]
  )

  const hasActiveFilters = Boolean(
    selectedCategory !== 'All' ||
      selectedSubcategory !== 'All' ||
      (brandFilterActive && filterBrand !== 'All') ||
      !showMissingPricesOnly
  )

  /** Share-link guests (after pricelist password) can filter missing prices too. */
  const showMissingPricesButton = canEditPrices && viewMode === 'table'
  const enableBulkSelect = canEditPrices && viewMode === 'table'
  const canExportPricelist = !isGuest && Boolean(user) && (Boolean(isSuperAdmin) || isAdmin)
  const showExportButton = canExportPricelist && viewMode === 'table'

  const exportOwnerLabel =
    isPlatformList
      ? t('pricelist.owner.platform')
      : translatePricelistOwnerLabel(
          owners.find((o) => o.id === ownerId) ?? { label: currentOwnerLabel },
          t
        )

  const totalFiltered = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PRICELIST_PAGE_SIZE) || 1)
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchQuery,
    ownerId,
    selectedCategory,
    selectedSubcategory,
    filterBrand,
    brandFilterActive,
    showMissingPricesOnly,
  ])

  useEffect(() => {
    setSelectedIds(new Set())
    setBulkMessage(null)
  }, [
    ownerId,
    searchQuery,
    selectedCategory,
    selectedSubcategory,
    filterBrand,
    brandFilterActive,
    showMissingPricesOnly,
  ])

  useEffect(() => {
    setShowMissingPricesOnly(true)
  }, [ownerId])

  useEffect(() => {
    setSearchQuery('')
  }, [selectedCategory, selectedSubcategory, filterBrand])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * PRICELIST_PAGE_SIZE
    return filteredItems.slice(start, start + PRICELIST_PAGE_SIZE)
  }, [filteredItems, safePage])

  const selectableOnPage = useMemo(
    () => paginatedItems.filter((row) => isPricelistRowBulkEditable(row, { isSeller })),
    [paginatedItems, isSeller]
  )

  const selectableFiltered = useMemo(
    () => filteredItems.filter((row) => isPricelistRowBulkEditable(row, { isSeller })),
    [filteredItems, isSeller]
  )

  const missingSelectable = useMemo(() => {
    const needOpts = guestShareLink ? { guestShareLink: true as const } : undefined
    return selectableFiltered.filter((row) => pricelistRowNeedsPrice(row, needOpts))
  }, [selectableFiltered, guestShareLink])

  const selectedRows = useMemo(
    () => filteredItems.filter((row) => selectedIds.has(row.product_id)),
    [filteredItems, selectedIds]
  )

  const allOnPageSelected =
    selectableOnPage.length > 0 &&
    selectableOnPage.every((row) => selectedIds.has(row.product_id))
  const someOnPageSelected = selectableOnPage.some((row) => selectedIds.has(row.product_id))
  const allFilteredSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((row) => selectedIds.has(row.product_id))

  const toBulkItems = (rows: PricelistRow[]): PricelistBulkItem[] =>
    rows.map((row) => ({
      productId: row.product_id,
      ...(row.price_seller_id ? { sellerId: row.price_seller_id } : {}),
    }))

  const toggleSelect = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const toggleSelectAllPage = () => {
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

  const selectAllFiltered = () => {
    setSelectedIds(new Set(selectableFiltered.map((row) => row.product_id)))
  }

  const selectAllMissing = () => {
    setSelectedIds(new Set(missingSelectable.map((row) => row.product_id)))
    if (!showMissingPricesOnly && missingSelectable.length > 0) {
      setShowMissingPricesOnly(true)
    }
  }

  const runBulkStockStatus = async (stockStatus: 'out' | 'temporary') => {
    if (!selectedRows.length) return
    setBulkWorking(true)
    setBulkMessage(null)
    try {
      const result = await bulkUpdate('stockStatus', toBulkItems(selectedRows), { stockStatus })
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
    if (!selectedRows.length) return
    setBulkWorking(true)
    setBulkMessage(null)
    try {
      const result = await bulkUpdate('price', toBulkItems(selectedRows), { unitPrice })
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

  const missingPricesTrailing =
    showMissingPricesButton || showExportButton ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {showExportButton ? (
          <PricelistExportButton
            items={exportScopeItems}
            ownerLabel={exportOwnerLabel}
            disabled={filledPriceExportCount === 0}
          />
        ) : null}
        {showMissingPricesButton ? (
          <PricelistMissingPricesButton
            active={showMissingPricesOnly}
            count={missingPriceCount}
            onToggle={() => setShowMissingPricesOnly((on) => !on)}
          />
        ) : null}
      </div>
    ) : null

  const paginationProps = {
    page: safePage,
    totalItems: totalFiltered,
    pageSize: PRICELIST_PAGE_SIZE,
    onPageChange: setCurrentPage,
    centered: true,
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
              onChange={(e) => setOwnerId(e.target.value)}
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

      {!loading && items.length > 0 ? <PricelistCatalogFilters /> : null}

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto" />
          <p className={`mt-4 text-sm ${muted}`}>{t('loading.pricelist')}</p>
        </div>
      ) : items.length === 0 ? (
        <div
          className={`text-center py-16 rounded-xl border ${
            isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
          }`}
        >
          <p className={muted}>{t('pricelist.empty.none')}</p>
          <p className={`text-sm mt-2 ${muted}`}>{t('pricelist.empty.starHint')}</p>
        </div>
      ) : scopedItems.length === 0 ? (
        <div
          className={`text-center py-16 rounded-xl border ${
            isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
          }`}
        >
          <p className={muted}>
            {hasActiveFilters && !searchQuery.trim()
              ? t('pricelist.empty.filters')
              : t('pricelist.empty.search')}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
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
              onClick={() => setShowMissingPricesOnly(false)}
            >
              {t('pricelist.filter.showAllProducts')}
            </button>
          ) : null}
        </div>
      ) : viewMode === 'table' ? (
        <>
          <CatalogPagination {...paginationProps} />
          {enableBulkSelect ? (
            <PricelistBulkActionsBar
              selectedCount={selectedIds.size}
              filteredCount={selectableFiltered.length}
              missingCount={missingSelectable.length}
              allOnPageSelected={allOnPageSelected}
              allFilteredSelected={allFilteredSelected}
              busy={bulkWorking}
              isDark={isDark}
              onSelectAllPage={toggleSelectAllPage}
              onSelectAllFiltered={selectAllFiltered}
              onSelectAllMissing={selectAllMissing}
              onClearSelection={() => setSelectedIds(new Set())}
              onSetOutOfStock={() => void runBulkStockStatus('out')}
              onSetTemporarilyOutOfStock={() => void runBulkStockStatus('temporary')}
              onOpenSetPrice={() => setBulkPriceOpen(true)}
            />
          ) : null}
          <PricelistTable
            items={paginatedItems}
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
            onSetStockStatus={setStockStatus}
            onClearPrice={isSuperAdmin ? clearPrice : undefined}
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
          <PricelistGrid items={paginatedItems} isDark={isDark} onOpenGallery={openGallery} />
          <CatalogPagination {...paginationProps} />
          <AppFooter />
        </>
      )}

      <PricelistBulkPriceModal
        open={bulkPriceOpen}
        count={selectedIds.size}
        busy={bulkWorking}
        onClose={() => setBulkPriceOpen(false)}
        onApply={runBulkPrice}
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
