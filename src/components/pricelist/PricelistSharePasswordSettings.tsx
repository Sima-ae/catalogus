'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import { useTheme } from '@/lib/theme'
import { buildPricelistShareUrl } from '@/components/pricelist/PricelistAccessGate'
import {
  isPlatformPricelistOwner,
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'

type Props = {
  ownerId: string
  ownerQuery: string
}

export default function PricelistSharePasswordSettings({ ownerId, ownerQuery }: Props) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [hasPassword, setHasPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isPlatform =
    isPlatformPricelistOwner(ownerId) || ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${buildPricelistShareUrl(ownerId)}`
      : buildPricelistShareUrl(ownerId)

  useEffect(() => {
    if (!user) return
    const q =
      ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM
        ? `?owner=${PRICELIST_OWNER_QUERY_PLATFORM}`
        : `?owner=${encodeURIComponent(ownerId)}`
    fetch(appPath(`/api/pricelist/access/password${q}`), {
      headers: catalogAuthHeaders(user),
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')
        setHasPassword(Boolean(data.hasPassword))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [user, ownerId, ownerQuery])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(appPath('/api/pricelist/access/password'), {
        method: 'PUT',
        headers: { ...catalogAuthHeaders(user), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ownerId: ownerQuery,
          password: password.trim() || undefined,
          clear: !password.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setHasPassword(Boolean(data.hasPassword))
      setPassword('')
      setMessage(data.hasPassword ? 'Share password saved.' : 'Share password removed.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const panel = isDark ? 'bg-dark-800 border-dark-700' : 'bg-gray-50 border-gray-200'

  return (
    <div className={`rounded-xl border p-4 ${panel}`}>
      <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {isPlatform ? 'Platform pricelist share password' : 'Share password'}
      </h2>
      <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {isPlatform
          ? 'Super admin and admin: set one password for the shared platform pricelist. Visitors who are not signed in must enter this password (not the site password) to view the list at the share link below.'
          : 'Visitors without an account can open your pricelist only with this password (not the site password). Leave empty and save to require sign-in only.'}
      </p>

      {loading ? (
        <p className={`text-sm mt-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading…</p>
      ) : (
        <form onSubmit={handleSave} className="mt-4 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasPassword ? 'New password (leave empty to remove)' : 'Set share password'}
            className={`w-full max-w-sm px-3 py-2 rounded-lg border text-sm ${
              isDark
                ? 'bg-dark-900 border-dark-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            autoComplete="new-password"
          />
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
              {saving ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
            </button>
          </div>
          {message ? <p className="text-sm text-green-600">{message}</p> : null}
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
        </form>
      )}

      <div className="mt-4">
        <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Share link
        </p>
        <code
          className={`block mt-1 text-xs break-all p-2 rounded ${
            isDark ? 'bg-dark-900 text-gray-300' : 'bg-white text-gray-800 border border-gray-200'
          }`}
        >
          {shareUrl}
        </code>
      </div>
    </div>
  )
}
