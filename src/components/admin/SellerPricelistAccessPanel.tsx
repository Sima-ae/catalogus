'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'
import { PRICELIST_OWNER_QUERY_PLATFORM } from '@/lib/pricelist-constants'

type Grant = {
  id: string
  seller_id: string
  list_owner_id: string
  status: string
  list_owner_label?: string
  list_owner_query?: string
  seller_email?: string
}

type UserOption = { id: string; email: string; name: string | null; role: string }

type Props = {
  userId: string
  userRole: string
}

export default function SellerPricelistAccessPanel({ userId, userRole }: Props) {
  const t = useAppTheme()
  const { user: actor } = useAuth()
  const [grants, setGrants] = useState<Grant[]>([])
  const [buyers, setBuyers] = useState<UserOption[]>([])
  const [sellers, setSellers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBuyerId, setSelectedBuyerId] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!actor) return
    setLoading(true)
    setError(null)
    try {
      const headers = adminAuthHeaders(actor)
      const [accessRes, usersRes] = await Promise.all([
        fetch(
          appPath(
            userRole === 'seller'
              ? `/api/admin/seller-pricelist-access?sellerId=${encodeURIComponent(userId)}`
              : `/api/admin/seller-pricelist-access?listOwnerId=${encodeURIComponent(userId)}`
          ),
          { headers, cache: 'no-store' }
        ),
        fetch(appPath('/api/admin/users'), { headers, cache: 'no-store' }),
      ])
      const accessData = await accessRes.json()
      const usersData = await usersRes.json()
      if (!accessRes.ok) throw new Error(accessData.error || 'Failed to load grants')
      if (!usersRes.ok) throw new Error(usersData.error || 'Failed to load users')
      setGrants(Array.isArray(accessData) ? accessData : [])
      const all = (usersData as UserOption[]) || []
      setBuyers(all.filter((u) => u.role === 'buyer'))
      setSellers(all.filter((u) => u.role === 'seller'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [actor, userId, userRole])

  useEffect(() => {
    load()
  }, [load])

  const updateStatus = async (grantId: string, status: 'approved' | 'rejected' | 'pending') => {
    if (!actor) return
    setBusy(true)
    try {
      const res = await fetch(appPath(`/api/admin/seller-pricelist-access/${grantId}`), {
        method: 'PATCH',
        headers: { ...adminAuthHeaders(actor), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  const createGrant = async (listOwnerId: string) => {
    if (!actor || userRole !== 'seller') return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(appPath('/api/admin/seller-pricelist-access'), {
        method: 'POST',
        headers: { ...adminAuthHeaders(actor), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId: userId, listOwnerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create grant')
      setSelectedBuyerId('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create grant')
    } finally {
      setBusy(false)
    }
  }

  const createGrantForBuyer = async (sellerId: string) => {
    if (!actor || userRole !== 'buyer') return
    setBusy(true)
    try {
      const res = await fetch(appPath('/api/admin/seller-pricelist-access'), {
        method: 'POST',
        headers: { ...adminAuthHeaders(actor), 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, listOwnerId: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create grant')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  if (userRole !== 'seller' && userRole !== 'buyer') return null

  return (
    <div className={`card p-6 mt-8 border ${t.border}`}>
      <h3 className={`text-lg font-semibold mb-2 ${t.heading}`}>Pricelist access</h3>
      <p className={`text-sm mb-4 ${t.muted}`}>
        Approve which pricelists this seller can view and price. Platform access is separate from
        buyer access.
      </p>

      {error ? <p className="text-red-500 text-sm mb-3">{error}</p> : null}

      {loading ? (
        <p className={t.muted}>Loading…</p>
      ) : (
        <>
          {userRole === 'seller' ? (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => createGrant(PRICELIST_OWNER_QUERY_PLATFORM)}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Grant platform pricelist access
              </button>
              <div className="flex gap-2 items-center">
                <select
                  value={selectedBuyerId}
                  onChange={(e) => setSelectedBuyerId(e.target.value)}
                  className={`input rounded-lg px-2 py-1.5 text-sm ${t.input}`}
                >
                  <option value="">Select buyer…</option>
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name || b.email}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !selectedBuyerId}
                  onClick={() => createGrant(selectedBuyerId)}
                  className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50"
                >
                  Grant buyer access
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                className={`rounded-lg border px-2 py-1.5 text-sm ${t.input}`}
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value
                  if (v) createGrantForBuyer(v)
                  e.target.value = ''
                }}
              >
                <option value="">Add seller access…</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ul className="space-y-2">
            {grants.length === 0 ? (
              <li className={`text-sm ${t.muted}`}>No access grants yet.</li>
            ) : (
              grants.map((g) => (
                <li
                  key={g.id}
                  className={`flex flex-wrap items-center justify-between gap-2 py-2 border-b ${t.border}`}
                >
                  <span className={`text-sm ${t.heading}`}>
                    {userRole === 'seller'
                      ? g.list_owner_label || g.list_owner_query || g.list_owner_id
                      : g.seller_email || g.seller_id}
                    <span className={`ml-2 text-xs uppercase ${t.muted}`}>{g.status}</span>
                  </span>
                  <div className="flex gap-2">
                    {g.status !== 'approved' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateStatus(g.id, 'approved')}
                        className="text-xs text-green-600 hover:underline"
                      >
                        Approve
                      </button>
                    ) : null}
                    {g.status !== 'rejected' ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => updateStatus(g.id, 'rejected')}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Reject
                      </button>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  )
}
