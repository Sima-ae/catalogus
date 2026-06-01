'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import type { PricelistRow } from '@/lib/pricelist-db'
import {
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'

function resolveOwnerQuery(ownerId: string, owners: PricelistOwnerOption[]): string {
  if (ownerId === PRICELIST_OWNER_QUERY_PLATFORM || ownerId === PLATFORM_PRICELIST_OWNER_ID) {
    return PRICELIST_OWNER_QUERY_PLATFORM
  }
  if (owners.find((o) => o.id === ownerId)?.kind === 'platform') {
    return PRICELIST_OWNER_QUERY_PLATFORM
  }
  return ownerId
}

export type PricelistOwnerOption = {
  id: string
  label: string
  kind: 'self' | 'platform' | 'buyer'
}

export function ownerQueryParam(ownerId: string, owners: PricelistOwnerOption[]): string {
  const match = owners.find((o) => o.id === ownerId || (o.kind === 'platform' && ownerId.includes('00000000')))
  if (match?.kind === 'platform') return PRICELIST_OWNER_QUERY_PLATFORM
  return ownerId
}

export function usePricelist(initialOwner?: string) {
  const { user } = useAuth()
  const [owners, setOwners] = useState<PricelistOwnerOption[]>([])
  const [ownerId, setOwnerId] = useState<string>('')
  const [items, setItems] = useState<PricelistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

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
    setLoading(true)
    setError(null)
    try {
      const q =
        ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM
          ? `owner=${PRICELIST_OWNER_QUERY_PLATFORM}`
          : `owner=${encodeURIComponent(ownerId)}`
      const res = await fetch(appPath(`/api/pricelist/items?${q}`), {
        headers: user ? catalogAuthHeaders(user) : {},
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load pricelist')
      setItems(data.items || [])
      setAccessMode(data.mode === 'guest' ? 'guest' : 'full')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pricelist')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user, ownerId, ownerQuery])

  useEffect(() => {
    loadOwners().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [user, loadOwners])

  useEffect(() => {
    if (!ownerId) return
    loadItems()
  }, [ownerId, loadItems])

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
    (ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM ? 'See my requests below!' : 'Pricelist')

  return {
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
    canManageItems,
    currentOwnerLabel,
    reload: loadItems,
    accessMode,
    isGuest,
    isSeller,
    ownerQuery,
  }
}
