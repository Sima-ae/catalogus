'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
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

  const loadOwners = useCallback(async () => {
    if (!user) return
    const res = await fetch(appPath('/api/pricelist/owners'), {
      headers: catalogAuthHeaders(user),
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
    if (!user || !ownerId) return
    setLoading(true)
    setError(null)
    try {
      const q =
        ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM
          ? `owner=${PRICELIST_OWNER_QUERY_PLATFORM}`
          : `owner=${encodeURIComponent(ownerId)}`
      const res = await fetch(appPath(`/api/pricelist/items?${q}`), {
        headers: catalogAuthHeaders(user),
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load pricelist')
      setItems(data.items || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pricelist')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user, ownerId, ownerQuery])

  useEffect(() => {
    if (!user) return
    loadOwners().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [user, loadOwners])

  useEffect(() => {
    if (!user || !ownerId) return
    loadItems()
  }, [user, ownerId, loadItems])

  const savePrice = async (productId: string, unitPrice: number) => {
    if (!user) return
    const res = await fetch(appPath('/api/pricelist/prices'), {
      method: 'PUT',
      headers: { ...catalogAuthHeaders(user), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        ownerId: ownerQuery,
        unitPrice,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to save price')
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

  const canEditPrices = user?.role === 'seller'
  const canManageItems =
    user?.role === 'admin' ||
    user?.role === 'buyer' ||
    user?.role === 'seller'

  const currentOwnerLabel =
    owners.find((o) => o.id === ownerId)?.label ||
    (ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM ? 'Platform pricelist' : 'Pricelist')

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
    removeItem,
    canEditPrices,
    canManageItems,
    currentOwnerLabel,
    reload: loadItems,
  }
}
