'use client'

import { useSearchParams } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth-local'
import { usePricelist } from '@/lib/use-pricelist'
import {
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'
import PricelistViewToggle from '@/components/pricelist/PricelistViewToggle'
import PricelistTable from '@/components/pricelist/PricelistTable'
import PricelistGrid from '@/components/pricelist/PricelistGrid'

export default function PricelistPageClient() {
  const searchParams = useSearchParams()
  const initialOwner = searchParams.get('owner') || undefined
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const { user } = useAuth()
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
    removeItem,
    canEditPrices,
    currentOwnerLabel,
  } = usePricelist(initialOwner)

  const ownerQuery =
    ownerId === PRICELIST_OWNER_QUERY_PLATFORM || ownerId === PLATFORM_PRICELIST_OWNER_ID
      ? PRICELIST_OWNER_QUERY_PLATFORM
      : ownerId

  const canRemoveItems =
    (user?.role === 'admin' &&
      (ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM || ownerId === PLATFORM_PRICELIST_OWNER_ID)) ||
    (user?.role === 'buyer' && ownerId === user.id) ||
    (user?.role === 'seller' && ownerId === user.id)

  const heading = isDark ? 'text-white' : 'text-gray-900'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const selectClass = isDark
    ? 'bg-dark-800 border-dark-600 text-white'
    : 'bg-white border-gray-300 text-gray-900'

  const showOwnerSelect = owners.length > 1

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${heading}`}>Pricelist</h1>
          <p className={`mt-1 text-sm ${muted}`}>{currentOwnerLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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

      {error ? (
        <p className="text-red-500 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto" />
          <p className={`mt-4 text-sm ${muted}`}>Loading pricelist…</p>
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
      ) : viewMode === 'table' ? (
        <PricelistTable
          items={items}
          canEditPrices={canEditPrices}
          canManageItems={canRemoveItems}
          isDark={isDark}
          onSavePrice={savePrice}
          onRemove={removeItem}
        />
      ) : (
        <PricelistGrid items={items} isDark={isDark} />
      )}
    </div>
  )
}
