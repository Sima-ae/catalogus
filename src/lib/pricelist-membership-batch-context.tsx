'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import {
  readAdminPricelistTargetSlug,
  ADMIN_PRICELIST_TARGET_CHANGE_EVENT,
} from '@/lib/admin-pricelist-target'

type BatchContextValue = {
  isOnList: (productId: string) => boolean
  loading: boolean
  setOnList: (productId: string, onList: boolean) => void
  ownerQuery: string
}

const PricelistMembershipBatchContext = createContext<BatchContextValue | null>(null)

type ProviderProps = {
  productIds: string[]
  ownerQuery?: string
  children: React.ReactNode
}

export function PricelistMembershipBatchProvider({
  productIds,
  ownerQuery,
  children,
}: ProviderProps) {
  const { user, loading: authLoading } = useAuth()
  const [onListIds, setOnListIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(false)

  const canUse =
    !authLoading &&
    Boolean(user) &&
    (user?.role === 'admin' || user?.role === 'buyer')

  const resolvedOwnerQuery = useMemo(() => {
    if (ownerQuery) return ownerQuery
    if (user?.role === 'admin') return readAdminPricelistTargetSlug()
    return user?.id ?? ''
  }, [ownerQuery, user])

  const idsKey = useMemo(
    () => Array.from(new Set(productIds.map((id) => id.trim()).filter(Boolean))).sort().join(','),
    [productIds]
  )

  const load = useCallback(async () => {
    if (!user || !canUse || !idsKey) {
      setOnListIds(new Set())
      return
    }
    setLoading(true)
    try {
      const q = new URLSearchParams({ productIds: idsKey })
      if (resolvedOwnerQuery) q.set('owner', resolvedOwnerQuery)
      const res = await fetch(appPath(`/api/pricelist/membership?${q}`), {
        headers: catalogAuthHeaders(user),
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Membership unavailable')
      const members = Array.isArray(data.members) ? data.members.map(String) : []
      setOnListIds(new Set(members))
    } catch {
      setOnListIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [user, canUse, idsKey, resolvedOwnerQuery])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!user || user.role !== 'admin' || ownerQuery) return
    const onTargetChange = () => {
      void load()
    }
    window.addEventListener(ADMIN_PRICELIST_TARGET_CHANGE_EVENT, onTargetChange)
    return () => window.removeEventListener(ADMIN_PRICELIST_TARGET_CHANGE_EVENT, onTargetChange)
  }, [user, ownerQuery, load])

  const setOnList = useCallback((productId: string, onList: boolean) => {
    setOnListIds((prev) => {
      const next = new Set(prev)
      if (onList) next.add(productId)
      else next.delete(productId)
      return next
    })
  }, [])

  const value = useMemo<BatchContextValue>(
    () => ({
      isOnList: (productId: string) => onListIds.has(productId),
      loading,
      setOnList,
      ownerQuery: resolvedOwnerQuery,
    }),
    [onListIds, loading, setOnList, resolvedOwnerQuery]
  )

  if (!canUse) {
    return <>{children}</>
  }

  return (
    <PricelistMembershipBatchContext.Provider value={value}>
      {children}
    </PricelistMembershipBatchContext.Provider>
  )
}

export function usePricelistMembershipBatchOptional() {
  return useContext(PricelistMembershipBatchContext)
}
