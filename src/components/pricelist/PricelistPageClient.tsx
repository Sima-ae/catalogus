'use client'

import { useEffect, useMemo, useState } from 'react'
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
import PricelistSharePasswordSettings from '@/components/pricelist/PricelistSharePasswordSettings'
import CatalogPagination from '@/components/shop/CatalogPagination'
import AppFooter from '@/components/layout/AppFooter'
import { useI18n } from '@/lib/i18n-context'

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
    clearPrice,
    requestPriceEdit,
    approvePriceEdit,
    removeItem,
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
  const [currentPage, setCurrentPage] = useState(1)

  const subtitle = isPlatformList ? 'See my request(s) below!' : currentOwnerLabel

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (row) =>
        row.name.toLowerCase().includes(q) || row.sku.toLowerCase().includes(q)
    )
  }, [items, searchQuery])

  const totalFiltered = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PRICELIST_PAGE_SIZE) || 1)
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, ownerId])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * PRICELIST_PAGE_SIZE
    return filteredItems.slice(start, start + PRICELIST_PAGE_SIZE)
  }, [filteredItems, safePage])

  const paginationProps = {
    page: safePage,
    totalItems: totalFiltered,
    pageSize: PRICELIST_PAGE_SIZE,
    onPageChange: setCurrentPage,
    compact: true,
  }

  const searchInputClass = isDark
    ? 'bg-dark-800 border-dark-600 text-white placeholder-gray-500'
    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="shrink-0 lg:min-w-[10rem]">
          <h1 className={`text-2xl font-bold ${heading}`}>Pricelist</h1>
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
            placeholder="Search by title or SKU…"
            className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${searchInputClass}`}
            aria-label="Search pricelist"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 shrink-0 lg:min-w-[12rem]">
          {showOwnerSelect ? (
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
              className={`rounded-lg border px-3 py-2 text-sm min-w-[12rem] ${selectClass}`}
              aria-label="Select pricelist"
            >
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : null}
          <PricelistViewToggle mode={viewMode} onChange={setViewMode} isDark={isDark} />
        </div>
      </div>

      {isGuest ? (
        <div className={`text-sm ${muted}`}>
          <p>Enter all prices in the empty fields below.</p>
          <p className="mt-1 text-xs text-red-500">
            Changes are automatically saved when you leave each field or tap the check button.
          </p>
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
          <p className={muted}>No products on this pricelist yet.</p>
          <p className={`text-sm mt-2 ${muted}`}>
            Use the star icon on product pages to add items.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className={`text-center py-16 rounded-xl border ${
            isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
          }`}
        >
          <p className={muted}>No products match your search.</p>
        </div>
      ) : viewMode === 'table' ? (
        <>
          <CatalogPagination {...paginationProps} centered />
          <PricelistTable
            items={paginatedItems}
            canEditPrices={canEditPrices}
            canManageItems={canRemoveItems}
            showStar={false}
            ownerQuery={ownerQuery}
            isDark={isDark}
            isSeller={isSeller}
            canApprovePriceEdits={canManagePriceEditRequests}
            canClearPrice={Boolean(isSuperAdmin)}
            onSavePrice={savePrice}
            onClearPrice={isSuperAdmin ? clearPrice : undefined}
            onRequestPriceEdit={isSeller ? requestPriceEdit : undefined}
            onApprovePriceEdit={canManagePriceEditRequests ? approvePriceEdit : undefined}
            onRemove={removeItem}
          />
          <CatalogPagination {...paginationProps} centered />
          <AppFooter />
        </>
      ) : (
        <>
          <CatalogPagination {...paginationProps} centered />
          <PricelistGrid items={paginatedItems} isDark={isDark} />
          <CatalogPagination {...paginationProps} centered />
          <AppFooter />
        </>
      )}
    </div>
  )
}
