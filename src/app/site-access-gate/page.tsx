'use client'

import { FormEvent, Suspense, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { appPath } from '@/lib/paths'
import BrandLogo from '@/components/brand/BrandLogo'
import { useI18n } from '@/lib/i18n-context'
import {
  navigateAfterSiteAccessUnlock,
  resolveSiteAccessRedirect,
  waitForSiteAccessUnlock,
} from '@/lib/site-access-redirect'
import { translateGateApiError } from '@/lib/i18n-gate-messages'
import { useSyncLocaleFromPath } from '@/lib/use-sync-locale-from-path'

function GateForm() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'
  const { t } = useI18n()
  useSyncLocaleFromPath(from)

  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    setSuccess('')
    let ok = false
    try {
      const res = await fetch(appPath('/api/site-access/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password, remember }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(translateGateApiError(data.error, t, 'site'))
        return
      }
      ok = true
      setSuccess(t('siteAccess.accessGranted'))
      await waitForSiteAccessUnlock()
      const target = resolveSiteAccessRedirect(from, pathname)
      navigateAfterSiteAccessUnlock(target)
    } catch {
      setError(t('siteAccess.verifyFailed'))
    } finally {
      if (!ok) setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-dark-900/95 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-access-title"
      >
        <div id="site-access-title" className="flex justify-center">
          <BrandLogo href="/" size="dashboard" priority centered />
        </div>
        <p className="mt-2 text-sm text-gray-400 text-center">{t('siteAccess.intro')}</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <p className="text-sm text-red-400 text-center" role="alert">
              {error}
            </p>
          )}
          {success ? (
            <p className="text-sm text-green-400 text-center" role="status">
              {success}
            </p>
          ) : null}

          <div>
            <label htmlFor="site-access-password" className="sr-only">
              {t('siteAccess.passwordLabel')}
            </label>
            <input
              id="site-access-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('siteAccess.passwordPlaceholder')}
              className="w-full px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-dark-500 text-primary-500 focus:ring-primary-500"
            />
            {t('siteAccess.remember')}
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 disabled:opacity-50"
          >
            {loading ? t('loading.checking') : t('siteAccess.continue')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SiteAccessGatePage() {
  const { t } = useI18n()
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-dark-900 text-gray-400">
          {t('loading.generic')}
        </div>
      }
    >
      <GateForm />
    </Suspense>
  )
}
