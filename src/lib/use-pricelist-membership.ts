'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import { PRICELIST_OWNER_QUERY_PLATFORM } from '@/lib/pricelist-constants'

export function usePricelistMembership(productId: string) {
  const { user, loading: authLoading } = useAuth()
  const [onList, setOnList] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const canUse =
    !authLoading &&
    Boolean(user) &&
    (user?.role === 'admin' || user?.role === 'buyer' || user?.role === 'seller')

  const load = useCallback(async () => {
    if (!user || !productId || !canUse) {
      setOnList(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        appPath(`/api/pricelist/membership?productId=${encodeURIComponent(productId)}`),
        { headers: catalogAuthHeaders(user), cache: 'no-store' }
      )
      const data = await res.json()
      if (res.ok) setOnList(Boolean(data.onList))
    } finally {
      setLoading(false)
    }
  }, [user, productId, canUse])

  useEffect(() => {
    load()
  }, [load])

  const toggle = async () => {
    if (!user || !productId) return { needsLogin: true as const }
    setBusy(true)
    try {
      if (onList) {
        const ownerQ =
          user.role === 'admin' ? `&owner=${PRICELIST_OWNER_QUERY_PLATFORM}` : ''
        const res = await fetch(
          appPath(`/api/pricelist/items?productId=${encodeURIComponent(productId)}${ownerQ}`),
          { method: 'DELETE', headers: catalogAuthHeaders(user) }
        )
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to remove')
        setOnList(false)
      } else {
        const body: Record<string, string> = { productId }
        if (user.role === 'admin') body.ownerId = PRICELIST_OWNER_QUERY_PLATFORM
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
