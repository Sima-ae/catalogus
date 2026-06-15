'use client'

import { FormEvent, useState } from 'react'
import BrandLogo from '@/components/brand/BrandLogo'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import { translateGateApiError } from '@/lib/i18n-gate-messages'
import { waitForSiteAccessUnlock } from '@/lib/site-access-redirect'

type SiteAccessGateFormProps = {
  introKey?: 'siteAccess.intro' | 'siteAccess.inactivityIntro'
  showRemember?: boolean
  onSuccess: () => void | Promise<void>
}

export default function SiteAccessGateForm({
  introKey = 'siteAccess.intro',
  showRemember = true,
  onSuccess,
}: SiteAccessGateFormProps) {
  const { t } = useI18n()
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
        body: JSON.stringify({ password, code: password, remember: showRemember && remember }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(translateGateApiError(data.error, t, 'site'))
        return
      }
      ok = true
      setSuccess(t('siteAccess.accessGranted'))
      await waitForSiteAccessUnlock()
      await onSuccess()
    } catch {
      setError(t('siteAccess.verifyFailed'))
    } finally {
      if (!ok) setLoading(false)
    }
  }

  return (
    <div
      className="w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-access-title"
    >
      <div id="site-access-title" className="flex justify-center">
        <BrandLogo href="/" size="dashboard" priority centered />
      </div>
      <p className="mt-2 text-sm text-gray-400 text-center">{t(introKey)}</p>

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
          <label htmlFor="site-access-credential" className="sr-only">
            {t('siteAccess.passwordLabel')}
          </label>
          <input
            id="site-access-credential"
            type="text"
            autoComplete="one-time-code"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('siteAccess.passwordPlaceholder')}
            className="w-full px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {showRemember ? (
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-dark-500 text-primary-500 focus:ring-primary-500"
            />
            {t('siteAccess.remember')}
          </label>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary py-3 disabled:opacity-50"
        >
          {loading ? t('loading.checking') : t('siteAccess.continue')}
        </button>
      </form>
    </div>
  )
}
