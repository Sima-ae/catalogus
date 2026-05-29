'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'

export default function CatalogModeSettings() {
  const t = useAppTheme()
  const { user, isSuperAdmin, loading: authLoading } = useAuth()
  const { refresh: refreshPublic } = useCatalogMode()
  const [catalogMode, setCatalogMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    if (!user || !isSuperAdmin) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(appPath('/api/admin/catalog-mode'), {
        headers: adminAuthHeaders(user),
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load catalog mode')
      setCatalogMode(Boolean(data.catalogMode))
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
    setCatalogMode(enabled)
    try {
      const res = await fetch(appPath('/api/admin/catalog-mode'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders(user),
        },
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setCatalogMode(Boolean(data.catalogMode))
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
      <h2 className={`text-lg font-semibold mb-1 ${t.heading}`}>Catalog mode</h2>
      <p className={`text-sm mb-4 ${t.muted}`}>
        Browse-only storefront: hides Add to Cart, download counts, and purchase prompts on product
        pages. Only super admin can change this.
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
              checked={catalogMode}
              disabled={saving}
              onChange={(e) => handleToggle(e.target.checked)}
            />
            <span className={t.body}>
              <span className="font-medium">Enable catalog mode</span>
              <span className={`block text-sm mt-1 ${t.muted}`}>
                Visitors can view products and categories but cannot add items to cart from the
                shop.
              </span>
            </span>
          </label>
          {error && <p className="text-red-500 dark:text-red-400 text-sm mt-3">{error}</p>}
          {saved && (
            <p className="text-primary-600 dark:text-primary-400 text-sm mt-3">
              Catalog mode saved.
            </p>
          )}
        </>
      )}
    </div>
  )
}
