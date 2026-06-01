'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { useProductCardDisplay } from '@/lib/product-card-display-context'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'

export default function ProductCardDisplaySettings() {
  const t = useAppTheme()
  const { user, isSuperAdmin, loading: authLoading } = useAuth()
  const { refresh: refreshPublic } = useProductCardDisplay()
  const [showCardDetails, setShowCardDetails] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!user || !isSuperAdmin) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(appPath('/api/admin/product-card-display'), {
        headers: adminAuthHeaders(user),
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load product card display')
      setShowCardDetails(Boolean(data.showCardDetails))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [user, isSuperAdmin])

  useEffect(() => {
    if (authLoading) return
    if (!isSuperAdmin) {
      setLoading(false)
      return
    }
    load()
  }, [authLoading, isSuperAdmin, load])

  const handleToggle = async (enabled: boolean) => {
    if (!user || !isSuperAdmin) return
    setSaving(true)
    setError('')
    setSaved(false)
    setShowCardDetails(enabled)
    try {
      const res = await fetch(appPath('/api/admin/product-card-display'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders(user),
        },
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setShowCardDetails(Boolean(data.showCardDetails))
      setSaved(true)
      await refreshPublic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !isSuperAdmin) {
    return null
  }

  return (
    <div className="card max-w-2xl mb-6 p-6 border border-primary-500/30">
      <h2 className={`text-lg font-semibold mb-1 ${t.heading}`}>Product card display</h2>
      <p className={`text-sm mb-4 ${t.muted}`}>
        Controls what appears on product cards in the shop grid (homepage, New Arrivals, and
        category listings). The full product page is not affected. Only super admin can change
        this.
      </p>

      {loading ? (
        <p className={t.muted}>Loading…</p>
      ) : (
        <>
          <label
            className={`flex items-start gap-3 cursor-pointer ${saving ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-400"
              checked={showCardDetails}
              disabled={saving}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            <span className={t.body}>
              <span className="font-medium">Show price and short description on product cards</span>
              <span className={`block text-sm mt-1 ${t.muted}`}>
                When off, cards show only the product image and title (no price, description, or
                Add to Cart on the card).
              </span>
            </span>
          </label>
          {error && <p className="text-red-500 dark:text-red-400 text-sm mt-3">{error}</p>}
          {saved && (
            <p className="text-primary-600 dark:text-primary-400 text-sm mt-3">
              Product card display saved.
            </p>
          )}
        </>
      )}
    </div>
  )
}
