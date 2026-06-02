'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import { useTheme } from '@/lib/theme'
import { buildPricelistShareUrl } from '@/lib/pricelist-share-url'
import {
  isPlatformPricelistOwner,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'
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

  const isPlatform =
    isPlatformPricelistOwner(ownerId) || ownerQuery === PRICELIST_OWNER_QUERY_PLATFORM

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

  const sharePath = buildPricelistShareUrl(ownerId)
  const shareUrl = useMemo(
    () => (origin ? `${origin}${sharePath}` : sharePath),
    [origin, sharePath]
  )

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

  const handleCopyLink = useCallback(async () => {
    const ok = await copyToClipboard(shareUrl)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } else {
      setError(t('pricelist.share.copyError'))
      window.setTimeout(() => setError(null), 3000)
    }
  }, [shareUrl])

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
      setMessage(data.hasPassword ? t('pricelist.share.saved') : t('pricelist.share.removed'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const panel = isDark ? 'bg-dark-800 border-dark-700' : 'bg-gray-50 border-gray-200'
  const inputClass = `min-w-0 flex-1 px-2 py-1.5 rounded-md border text-xs ${
    isDark ? 'bg-dark-900 border-dark-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
  }`
  const linkBoxClass = `min-w-0 flex-1 px-2 py-1.5 rounded-md border text-xs truncate text-left transition-colors ${
    isDark
      ? 'bg-dark-900 border-dark-600 text-gray-300 hover:border-primary-500/50 hover:bg-dark-800'
      : 'bg-white border-gray-300 text-gray-800 hover:border-primary-400 hover:bg-gray-50'
  }`
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const label = isDark ? 'text-gray-300' : 'text-gray-700'

  return (
    <div className={`rounded-lg border p-3 ${panel}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {isPlatform ? t('pricelist.share.titlePlatform') : t('pricelist.share.title')}
        </h2>
        {hasPassword && !loading ? (
          <span className="text-[10px] uppercase tracking-wide text-green-600">
            {t('pricelist.share.active')}
          </span>
        ) : null}
      </div>
      <p className={`text-[11px] leading-snug mt-0.5 ${muted}`}>
        {isPlatform ? t('pricelist.share.hintPlatform') : t('pricelist.share.hintOwner')}
      </p>

      {loading ? (
        <p className={`text-xs mt-2 ${muted}`}>{t('loading.generic')}</p>
      ) : (
        <form onSubmit={handleSave} className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={hasPassword ? t('pricelist.share.newPassword') : t('pricelist.share.setPassword')}
            className={`${inputClass} max-w-[14rem] sm:max-w-xs`}
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={saving}
            className="btn-primary text-xs px-3 py-1.5 shrink-0 disabled:opacity-50"
          >
            {saving ? t('pricelist.saving') : hasPassword ? t('pricelist.share.update') : t('pricelist.share.set')}
          </button>
          {message ? <span className="text-xs text-green-600">{message}</span> : null}
          {error ? <span className="text-xs text-red-500">{error}</span> : null}
        </form>
      )}

      <div className="mt-2.5">
        <p className={`text-[11px] font-medium ${label}`}>{t('pricelist.share.linkLabel')}</p>
        <div className="mt-1 flex items-stretch gap-1.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className={`${linkBoxClass} cursor-pointer`}
            title={t('pricelist.share.copyTitle')}
            aria-label={t('pricelist.share.copy')}
          >
            {shareUrl}
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="btn-secondary shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5"
            aria-label={t('pricelist.share.copy')}
          >
            {copied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-green-500" aria-hidden />
                {t('pricelist.share.copied')}
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-3.5 h-3.5" aria-hidden />
                {t('pricelist.share.copy')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
