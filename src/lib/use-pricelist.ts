'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import type { PricelistRow, PricelistStockStatus } from '@/lib/pricelist-db'
import { buildPricelistItemsQueryString } from '@/lib/pricelist-items-query-string'
import {
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'

export type PricelistBulkItem = {
  productId: string
  sellerId?: string
}

export type PricelistBulkFilterScope = {
  search?: string
  category?: string
  subcategory?: string
  brand?: string
  missingPricesOnly?: boolean
  filledPricesOnly?: boolean
  outOfStockOnly?: boolean
}

export type PricelistBulkResult = {
  updated: number
  skipped: number
  failed: number
  errors: string[]
}

export type PricelistBulkRemoveResult = {
  removed: number
  failed: number
  errors: string[]
}

function resolveOwnerQuery(ownerId: string, owners: PricelistOwnerOption[]): string {
  const match = owners.find((o) => o.id === ownerId)
  if (match?.kind === 'platform') return match.id
  if (ownerId === PLATFORM_PRICELIST_OWNER_ID) return PRICELIST_OWNER_QUERY_PLATFORM
  return ownerId
}

export type PricelistOwnerOption = {
  id: string
  label: string
  kind: 'self' | 'platform' | 'buyer'
}

export type PricelistListQuery = {
  page: number
  limit?: number
  search?: string
  category?: string
  subcategory?: string
  brand?: string
  missingPricesOnly?: boolean
  filledPricesOnly?: boolean
  outOfStockOnly?: boolean
}

export function ownerQueryParam(ownerId: string, owners: PricelistOwnerOption[]): string {
  const match = owners.find((o) => o.id === ownerId)
  if (match?.kind === 'platform') return match.id
  if (ownerId === PLATFORM_PRICELIST_OWNER_ID) return PRICELIST_OWNER_QUERY_PLATFORM
  return ownerId
}

export function usePricelist(initialOwner?: string, listQuery?: PricelistListQuery) {
  const { user } = useAuth()
  const [owners, setOwners] = useState<PricelistOwnerOption[]>([])
  const [ownerId, setOwnerId] = useState<string>('')
  const [items, setItems] = useState<PricelistRow[]>([])
  const [total, setTotal] = useState(0)
  const [totalOnPricelist, setTotalOnPricelist] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [missingPriceCount, setMissingPriceCount] = useState(0)
  const [exportFilledCount, setExportFilledCount] = useState(0)
  const [outOfStockCount, setOutOfStockCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const hasLoadedOnce = useRef(false)

  const ownerQuery = resolveOwnerQuery(ownerId, owners)

  const [accessMode, setAccessMode] = useState<'full' | 'guest'>('full')

  const loadOwners = useCallback(async () => {
    if (!user) {
      setOwners([])
      if (initialOwner) {
        let def = initialOwner
        if (def === PLATFORM_PRICELIST_OWNER_ID) {
          def = PRICELIST_OWNER_QUERY_PLATFORM
        }
        setOwnerId((prev) => prev || def)
      }
      return
    }
    const res = await fetch(appPath('/api/pricelist/owners'), {
      headers: catalogAuthHeaders(user),
      credentials: 'include',
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load owners')
    const list = (data.owners || []) as PricelistOwnerOption[]
    setOwners(list)
    let def = initialOwner || data.defaultOwnerId || list[0]?.id || ''
    if (def === PLATFORM_PRICELIST_OWNER_ID) {
      const platformOpt = list.find((o) => o.kind === 'platform')
      if (platformOpt) def = platformOpt.id
    }
    setOwnerId((prev) => prev || def)
    return def
  }, [user, initialOwner])

  const loadItems = useCallback(async () => {
    if (!ownerId) return
    if (!hasLoadedOnce.current) setLoading(true)
    else setPageLoading(true)
    setError(null)
    try {
      const owner =
        ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM
          ? PRICELIST_OWNER_QUERY_PLATFORM
          : ownerId
      const qs = buildPricelistItemsQueryString({
        owner,
        page: listQuery?.page ?? 1,
        limit: listQuery?.limit,
        search: listQuery?.search,
        category: listQuery?.category,
        subcategory: listQuery?.subcategory,
        brand: listQuery?.brand,
        missingPricesOnly: listQuery?.missingPricesOnly,
        filledPricesOnly: listQuery?.filledPricesOnly,
        outOfStockOnly: listQuery?.outOfStockOnly,
      })
      const res = await fetch(appPath(`/api/pricelist/items?${qs}`), {
        headers: user ? catalogAuthHeaders(user) : {},
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load pricelist')
      setItems(data.items || [])
      setTotal(Number(data.total ?? 0))
      setTotalOnPricelist(Number(data.totalOnPricelist ?? data.total ?? 0))
      setTotalPages(Math.max(1, Number(data.totalPages ?? 1)))
      setMissingPriceCount(Number(data.missingPriceCount ?? 0))
      setExportFilledCount(Number(data.exportFilledCount ?? 0))
      setOutOfStockCount(Number(data.outOfStockCount ?? 0))
      setAccessMode(data.mode === 'guest' ? 'guest' : 'full')
      hasLoadedOnce.current = true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pricelist')
      setItems([])
      setTotal(0)
      setTotalOnPricelist(0)
      setTotalPages(1)
      setMissingPriceCount(0)
      setExportFilledCount(0)
      setOutOfStockCount(0)
    } finally {
      setLoading(false)
      setPageLoading(false)
    }
  }, [user, ownerId, ownerQuery, listQuery])

  const fetchSelectionProductIds = useCallback(
    async (scope: 'filtered' | 'allMissing'): Promise<string[]> => {
      if (!ownerId) return []
      const owner =
        ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM
          ? PRICELIST_OWNER_QUERY_PLATFORM
          : ownerId
      const qs = buildPricelistItemsQueryString({
        owner,
        idsOnly: true,
        search: scope === 'filtered' ? listQuery?.search : undefined,
        category: scope === 'filtered' ? listQuery?.category : undefined,
        subcategory: scope === 'filtered' ? listQuery?.subcategory : undefined,
        brand: scope === 'filtered' ? listQuery?.brand : undefined,
        missingPricesOnly: scope === 'allMissing' ? true : listQuery?.missingPricesOnly,
        filledPricesOnly: scope === 'filtered' ? listQuery?.filledPricesOnly : undefined,
        outOfStockOnly: scope === 'filtered' ? listQuery?.outOfStockOnly : undefined,
      })
      const res = await fetch(appPath(`/api/pricelist/items?${qs}`), {
        headers: user ? catalogAuthHeaders(user) : {},
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load selection')
      return Array.isArray(data.productIds) ? data.productIds.map(String) : []
    },
    [user, ownerId, ownerQuery, listQuery]
  )

  const fetchExportItems = useCallback(async (): Promise<PricelistRow[]> => {
    if (!ownerId) return []
    const owner =
      ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM
        ? PRICELIST_OWNER_QUERY_PLATFORM
        : ownerId
    const qs = buildPricelistItemsQueryString({
      owner,
      search: listQuery?.search,
      category: listQuery?.category,
      subcategory: listQuery?.subcategory,
      brand: listQuery?.brand,
      missingPricesOnly: false,
      exportAll: true,
    })
    const res = await fetch(appPath(`/api/pricelist/items?${qs}`), {
      headers: user ? catalogAuthHeaders(user) : {},
      credentials: 'include',
      cache: 'no-store',
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to load export data')
    return (data.items || []) as PricelistRow[]
  }, [user, ownerId, ownerQuery, listQuery])

  useEffect(() => {
    loadOwners().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [user, loadOwners])

  useEffect(() => {
    hasLoadedOnce.current = false
  }, [ownerId])

  useEffect(() => {
    if (!ownerId) return
    loadItems()
  }, [ownerId, loadItems])

  const setStockStatus = async (
    productId: string,
    stockStatus: PricelistStockStatus,
    priceSellerId?: string
  ) => {
    const res = await fetch(appPath('/api/pricelist/prices'), {
      method: 'PUT',
      headers: {
        ...(user ? catalogAuthHeaders(user) : {}),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        productId,
        ownerId: ownerQuery,
        stockStatus,
        ...(priceSellerId ? { sellerId: priceSellerId } : {}),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save stock status')
    await loadItems()
  }

  const savePrice = async (productId: string, unitPrice: number, priceSellerId?: string) => {
    const res = await fetch(appPath('/api/pricelist/prices'), {
      method: 'PUT',
      headers: {
        ...(user ? catalogAuthHeaders(user) : {}),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        productId,
        ownerId: ownerQuery,
        unitPrice,
        ...(priceSellerId ? { sellerId: priceSellerId } : {}),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save price')
    await loadItems()
  }

  const saveShipping = async (
    productId: string,
    shippingCost: number,
    shippingSellerId?: string
  ) => {
    const res = await fetch(appPath('/api/pricelist/shipping'), {
      method: 'PUT',
      headers: {
        ...(user ? catalogAuthHeaders(user) : {}),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        productId,
        ownerId: ownerQuery,
        shippingCost,
        ...(shippingSellerId ? { sellerId: shippingSellerId } : {}),
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save shipping cost')
    await loadItems()
  }

  const clearShipping = async (productId: string, shippingSellerId?: string) => {
    if (!user) return
    const res = await fetch(appPath('/api/pricelist/shipping'), {
      method: 'DELETE',
      headers: {
        ...adminAuthHeaders(user),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        productId,
        ownerId: ownerQuery,
        sellerId: shippingSellerId,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to clear shipping cost')
    await loadItems()
  }

  const clearPrice = async (productId: string, priceSellerId?: string) => {
    if (!user) return
    const res = await fetch(appPath('/api/pricelist/prices'), {
      method: 'DELETE',
      headers: {
        ...adminAuthHeaders(user),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        productId,
        ownerId: ownerQuery,
        sellerId: priceSellerId,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to clear price')
    await loadItems()
  }

  const requestPriceEdit = async (productId: string) => {
    if (!user) return
    const res = await fetch(appPath('/api/pricelist/prices/edit-request'), {
      method: 'POST',
      headers: {
        ...catalogAuthHeaders(user),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        productId,
        ownerId: ownerQuery,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to request edit')
    await loadItems()
  }

  const approvePriceEdit = async (requestId: string) => {
    if (!user) return
    const res = await fetch(appPath('/api/pricelist/prices/edit-request/approve'), {
      method: 'POST',
      headers: {
        ...adminAuthHeaders(user),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ requestId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to approve edit')
    await loadItems()
  }

  const bulkUpdate = async (
    action: 'stockStatus' | 'price' | 'shipping',
    bulkItems: PricelistBulkItem[],
    payload: {
      stockStatus?: PricelistStockStatus
      unitPrice?: number
      shippingCost?: number
      applyToFilters?: PricelistBulkFilterScope
    }
  ): Promise<PricelistBulkResult> => {
    const useFilters = Boolean(payload.applyToFilters)
    if (!useFilters && !bulkItems.length) {
      return { updated: 0, skipped: 0, failed: 0, errors: [] }
    }

    const res = await fetch(appPath('/api/pricelist/prices/bulk'), {
      method: 'POST',
      headers: {
        ...(user ? catalogAuthHeaders(user) : {}),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ownerId: ownerQuery,
        action,
        items: useFilters ? undefined : bulkItems,
        applyToFilters: payload.applyToFilters,
        stockStatus: payload.stockStatus,
        unitPrice: payload.unitPrice,
        shippingCost: payload.shippingCost,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Bulk update failed')

    await loadItems()
    return {
      updated: Number(data.updated ?? 0),
      skipped: Number(data.skipped ?? 0),
      failed: Number(data.failed ?? 0),
      errors: Array.isArray(data.errors) ? data.errors.map(String) : [],
    }
  }

  const removeItem = async (productId: string) => {
    if (!user) return
    const q =
      ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM
        ? `productId=${productId}&owner=${PRICELIST_OWNER_QUERY_PLATFORM}`
        : `productId=${productId}&owner=${encodeURIComponent(ownerId)}`
    const res = await fetch(appPath(`/api/pricelist/items?${q}`), {
      method: 'DELETE',
      headers: catalogAuthHeaders(user),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to remove')
    await loadItems()
  }

  const bulkRemove = async (
    bulkItems: PricelistBulkItem[],
    applyToFilters?: PricelistBulkFilterScope
  ): Promise<PricelistBulkRemoveResult> => {
    const useFilters = Boolean(applyToFilters)
    if (!useFilters && !bulkItems.length) {
      return { removed: 0, failed: 0, errors: [] }
    }

    const res = await fetch(appPath('/api/pricelist/items/bulk-remove'), {
      method: 'POST',
      headers: {
        ...(user ? catalogAuthHeaders(user) : {}),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        ownerId: ownerQuery,
        items: useFilters ? undefined : bulkItems,
        applyToFilters,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Bulk remove failed')

    await loadItems()
    return {
      removed: Number(data.removed ?? 0),
      failed: Number(data.failed ?? 0),
      errors: Array.isArray(data.errors) ? data.errors.map(String) : [],
    }
  }

  const isGuest = accessMode === 'guest'
  const isSeller = user?.role === 'seller'
  const canEditPrices =
    isGuest ||
    (Boolean(user) && (user?.role === 'seller' || user?.role === 'admin'))
  const canManageItems =
    !isGuest &&
    (user?.role === 'admin' || user?.role === 'buyer' || user?.role === 'seller')

  const currentOwnerLabel =
    owners.find((o) => o.id === ownerId)?.label ||
    (ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM ? 'See my request(s) below!' : 'Pricelist')

  return {
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
    canEditPrices,
    canManageItems,
    currentOwnerLabel,
    reload: loadItems,
    fetchSelectionProductIds,
    fetchExportItems,
    accessMode,
    isGuest,
    isSeller,
    ownerQuery,
  }
}
