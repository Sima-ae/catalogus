'use client'

import { FormEvent, Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { appPath } from '@/lib/paths'
import BrandLogo from '@/components/brand/BrandLogo'
import {
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'

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

function ownerQueryFromParams(searchParams: URLSearchParams, loggedIn: boolean): string | null {
  const raw = searchParams.get('owner')
  if (raw) return raw
  if (!loggedIn) return null
  return null
}

function PricelistAccessGateInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<AccessStatus | null>(null)
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const ownerParam = ownerQueryFromParams(searchParams, Boolean(user))

  const loadStatus = useCallback(async () => {
    const q = ownerParam ? `?owner=${encodeURIComponent(ownerParam)}` : ''
    const res = await fetch(appPath(`/api/pricelist/access/status${q}`), {
      credentials: 'include',
      cache: 'no-store',
      headers: catalogAuthHeaders(user),
    })
    const data = await res.json()
    setStatus(data)
  }, [ownerParam, user])

  useEffect(() => {
    if (authLoading) return
    loadStatus().catch(() => setStatus({ allowed: false, requiresLogin: true }))
  }, [authLoading, loadStatus, user])

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    if (!ownerParam) return
    setVerifying(true)
    setVerifyError('')
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
      setPassword('')
      await loadStatus()
    } catch {
      setVerifyError('Unable to verify. Try again.')
    } finally {
      setVerifying(false)
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

  const showPassword = status.requiresPassword && ownerParam
  const showLoginOnly = status.requiresLogin && !showPassword

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
        <p className="mt-4 text-sm text-gray-400 text-center">
          {showPassword
            ? ownerParam === PRICELIST_OWNER_QUERY_PLATFORM
              ? 'This platform pricelist is protected. Enter the share password set by an admin (not the site password).'
              : 'This pricelist is protected. Enter the password shared by the list owner (not the site password).'
            : showLoginOnly
              ? 'Sign in to view this pricelist, or open a shared link with ?owner= (use owner=platform for the admin list).'
              : status.error || 'You do not have access to this pricelist.'}
        </p>

        {showPassword ? (
          <form onSubmit={handleVerify} className="mt-8 space-y-4">
            {verifyError ? (
              <p className="text-sm text-red-400 text-center" role="alert">
                {verifyError}
              </p>
            ) : null}
            <input
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Pricelist password"
              className="w-full px-4 py-3 rounded-lg bg-dark-700 border border-dark-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-dark-500"
              />
              Remember on this device (30 days)
            </label>
            <button type="submit" disabled={verifying} className="w-full btn-primary py-3 disabled:opacity-50">
              {verifying ? 'Checking…' : 'View pricelist'}
            </button>
          </form>
        ) : null}

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

export function buildPricelistShareUrl(ownerId: string): string {
  const owner =
    ownerId === PLATFORM_PRICELIST_OWNER_ID ? PRICELIST_OWNER_QUERY_PLATFORM : ownerId
  return appPath(`/pricelist?owner=${encodeURIComponent(owner)}`)
}
