'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import { useTheme } from '@/lib/theme'
import { buildPricelistShareUrl } from '@/lib/pricelist-share-url'
import { PRICELIST_OWNER_QUERY_PLATFORM } from '@/lib/pricelist-constants'
import { useI18n } from '@/lib/i18n-context'

type Props = {
  ownerId: string
  ownerQuery: string
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      return ok
    } catch {
      return false
    }
  }
}

export default function PricelistSharePasswordSettings({ ownerId, ownerQuery }: Props) {
  const { user } = useAuth()
  const { theme } = useTheme()
  const { t } = useI18n()
  const isDark = theme === 'dark'
  const [hasPassword, setHasPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  const sharePath = buildPricelistShareUrl(ownerQuery || ownerId)
  const shareUrl = useMemo(
    () => (origin ? `${origin}${sharePath}` : sharePath),
    [origin, sharePath]
  )

  useEffect(() => {
    if (!user) return
    const q = `?owner=${encodeURIComponent(ownerQuery || PRICELIST_OWNER_QUERY_PLATFORM)}`
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

  const handleCopyLink = useCallback(async () => {
    const ok = await copyToClipboard(shareUrl)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } else {
      setError(t('pricelist.share.copyError'))
      window.setTimeout(() => setError(null), 3000)
    }
  }, [shareUrl, t])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(appPath('/api/pricelist/access/password'), {
        method: 'PUT',
        headers: {
          ...catalogAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ownerId: ownerQuery || ownerId,
          password: password.trim() || null,
          clear: !password.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      setHasPassword(Boolean(data.hasPassword))
      setPassword('')
      setMessage(
        data.hasPassword ? t('pricelist.share.passwordSaved') : t('pricelist.share.passwordCleared')
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">{t('loading.generic')}</p>
  }

  const panelClass = isDark
    ? 'bg-dark-800/60 border-dark-600'
    : 'bg-gray-50 border-gray-200'

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${panelClass}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{t('pricelist.share.title')}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-all">{shareUrl}</p>
        </div>
        <button
          type="button"
          onClick={handleCopyLink}
          className="btn-secondary text-sm inline-flex items-center gap-2 shrink-0"
        >
          {copied ? (
            <CheckIcon className="h-4 w-4 text-green-500" />
          ) : (
            <ClipboardDocumentIcon className="h-4 w-4" />
          )}
          {copied ? t('pricelist.share.copied') : t('pricelist.share.copyLink')}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <label className="flex-1 space-y-1">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('pricelist.share.passwordLabel')}
          </span>
          <input
            type="password"
            className="input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              hasPassword
                ? t('pricelist.share.passwordPlaceholderUpdate')
                : t('pricelist.share.passwordPlaceholder')
            }
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="btn-primary text-sm" disabled={saving}>
          {saving ? t('pricelist.share.saving') : t('pricelist.share.savePassword')}
        </button>
      </form>

      {hasPassword ? (
        <p className="text-xs text-amber-600 dark:text-amber-400">{t('pricelist.share.hasPassword')}</p>
      ) : null}
      {message ? <p className="text-sm text-green-600 dark:text-green-400">{message}</p> : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  )
}
