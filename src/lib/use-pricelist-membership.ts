'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import { readAdminPricelistTargetSlug } from '@/lib/admin-pricelist-target'

type Options = {
  /** Pricelist owner query (`platform` or user id) when not using the actor default list. */
  ownerQuery?: string
  /** Skip membership fetch when the product is already known to be on this list. */
  assumedOnList?: boolean
}

export function usePricelistMembership(productId: string, options?: Options) {
  const { user, loading: authLoading } = useAuth()
  const ownerQuery = options?.ownerQuery
  const assumedOnList = options?.assumedOnList ?? false
  const [onList, setOnList] = useState(assumedOnList)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const canUse =
    !authLoading &&
    Boolean(user) &&
    (user?.role === 'admin' || user?.role === 'buyer')

  const membershipOwnerQuery = (): string => {
    if (ownerQuery) return ownerQuery
    if (user?.role === 'admin') return readAdminPricelistTargetSlug()
    return user?.id ?? ''
  }

  const load = useCallback(async () => {
    if (!user || !productId || !canUse) {
      setOnList(false)
      return
    }
    if (assumedOnList) {
      setOnList(true)
      return
    }
    setLoading(true)
    try {
      const owner = membershipOwnerQuery()
      const q = new URLSearchParams({ productId })
      if (owner) q.set('owner', owner)
      const res = await fetch(appPath(`/api/pricelist/membership?${q}`), {
        headers: catalogAuthHeaders(user),
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok) setOnList(Boolean(data.onList))
    } finally {
      setLoading(false)
    }
  }, [user, productId, canUse, assumedOnList, ownerQuery])

  useEffect(() => {
    load()
  }, [load])

  const toggle = async () => {
    if (!user || !productId) return { needsLogin: true as const }
    setBusy(true)
    try {
      const owner = membershipOwnerQuery()
      if (onList) {
        const params = new URLSearchParams({ productId })
        if (owner) params.set('owner', owner)
        const res = await fetch(appPath(`/api/pricelist/items?${params}`), {
          method: 'DELETE',
          headers: catalogAuthHeaders(user),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to remove')
        setOnList(false)
      } else {
        const body: Record<string, string> = { productId }
        if (owner) body.ownerId = owner
        const res = await fetch(appPath('/api/pricelist/items'), {
          method: 'POST',
          headers: { ...catalogAuthHeaders(user), 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to add')
        setOnList(true)
      }
      return { needsLogin: false as const, ok: true as const }
    } catch (e) {
      return {
        needsLogin: false as const,
        ok: false as const,
        error: e instanceof Error ? e.message : 'Failed',
      }
    } finally {
      setBusy(false)
    }
  }

  return { onList, loading, busy, canUse, toggle, reload: load }
}
