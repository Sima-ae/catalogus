'use client'

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import BrandLogo from '@/components/brand/BrandLogo'
import { PRICELIST_OWNER_QUERY_PLATFORM } from '@/lib/pricelist-constants'
import { useI18n } from '@/lib/i18n-context'

type AccessStatus = {
  allowed: boolean
  requiresLogin?: boolean
  requiresPassword?: boolean
  hasPassword?: boolean
  loggedIn?: boolean
  ownerId?: string
  mode?: string
  error?: string
}

function ownerQueryFromParams(searchParams: URLSearchParams): string | null {
  const raw = searchParams.get('owner')
  return raw?.trim() ? raw.trim() : null
}

function PricelistAccessGateInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const [status, setStatus] = useState<AccessStatus | null>(null)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [verifySuccess, setVerifySuccess] = useState('')
  const [verifying, setVerifying] = useState(false)

  const ownerParam = ownerQueryFromParams(searchParams)

  const loadStatus = useCallback(async () => {
    const q = ownerParam ? `?owner=${encodeURIComponent(ownerParam)}` : ''
    const res = await fetch(appPath(`/api/pricelist/access/status${q}`), {
      credentials: 'include',
      cache: 'no-store',
      headers: catalogAuthHeaders(user),
    })
    const data = (await res.json()) as AccessStatus
    if (!res.ok && !data.error) {
      data.error = 'Unable to check access'
    }
    setStatus(data)
  }, [ownerParam, user])

  useEffect(() => {
    if (authLoading) return
    loadStatus().catch(() =>
      setStatus({
        allowed: false,
        requiresLogin: !ownerParam,
        requiresPassword: Boolean(ownerParam),
        hasPassword: Boolean(ownerParam),
        loggedIn: Boolean(user),
      })
    )
  }, [authLoading, loadStatus, user, ownerParam])

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (!ownerParam) return
    if (verifying) return
    setVerifying(true)
    setVerifyError('')
    setVerifySuccess('')
    let ok = false
    try {
      const res = await fetch(appPath('/api/pricelist/access/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ owner: ownerParam, password, remember }),
      })
      const data = await res.json()
      if (!res.ok) {
        setVerifyError(data.error || 'Incorrect password')
        return
      }
      ok = true
      setVerifySuccess(t('password.correctLoading'))
      setPassword('')
      await loadStatus()
    } catch {
      setVerifyError('Unable to verify. Try again.')
    } finally {
      if (!ok) setVerifying(false)
    }
  }

  if (authLoading || status === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (status.allowed) {
    return <>{children}</>
  }

  const loginHref = appPath(
    `/login?from=${encodeURIComponent(`/pricelist${ownerParam ? `?owner=${ownerParam}` : ''}`)}`
  )

  const sharedLink = Boolean(ownerParam)
  const sharePasswordConfigured = Boolean(status.requiresPassword || status.hasPassword)
  const showPasswordForm =
    sharedLink && (!status.loggedIn || sharePasswordConfigured)

  const showLoginOnly = !showPasswordForm && Boolean(status.requiresLogin)

  const passwordHint = sharePasswordConfigured
    ? ownerParam === PRICELIST_OWNER_QUERY_PLATFORM
      ? 'Enter the platform pricelist share password (not your site or account password).'
      : 'Enter the pricelist share password from the list owner (not your site or account password).'
    : 'This list does not have a share password yet. Sign in if you have access, or ask the owner for the link once a password is set.'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-dark-900/95 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-md rounded-2xl border border-dark-600 bg-dark-800 p-8 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricelist-access-title"
      >
        <div id="pricelist-access-title" className="flex justify-center">
          <BrandLogo href="/" size="dashboard" priority centered />
        </div>

        {showPasswordForm ? (
          <>
            <p className="mt-4 text-sm text-gray-400 text-center">{passwordHint}</p>
            <form onSubmit={handleVerify} className="mt-6 space-y-4">
              {verifyError ? (
                <p className="text-sm text-red-400 text-center" role="alert">
                  {verifyError}
                </p>
              ) : null}
              {verifySuccess ? (
                <p className="text-sm text-green-400 text-center" role="status">
                  {verifySuccess}
                </p>
              ) : null}
              <div>
                <label htmlFor="pricelist-share-password" className="sr-only">
                  Pricelist share password
                </label>
                <input
                  id="pricelist-share-password"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required={sharePasswordConfigured}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Pricelist password"
                  className="w-full px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded border-dark-500"
                />
                Remember on this device (30 days)
              </label>
              <button
                type="submit"
                disabled={verifying || !sharePasswordConfigured}
                className="w-full btn-primary py-3 disabled:opacity-50"
              >
                {verifying ? 'Checking…' : 'View pricelist'}
              </button>
            </form>
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-400 text-center">
            {showLoginOnly
              ? 'Sign in to view this pricelist, or open a shared link with ?owner= (use owner=platform for the platform list).'
              : status.error || 'You do not have access to this pricelist.'}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 text-center text-sm">
          <Link href={loginHref} className="text-primary-400 hover:underline">
            Sign in to your account
          </Link>
          <Link href={appPath('/')} className="text-gray-500 hover:text-gray-300">
            Back to shop
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PricelistAccessGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-dark-900">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
        </div>
      }
    >
      <PricelistAccessGateInner>{children}</PricelistAccessGateInner>
    </Suspense>
  )
}
