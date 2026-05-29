'use client'

import { FormEvent, Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { appPath } from '@/lib/paths'
import BrandLogo from '@/components/brand/BrandLogo'

function GateForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'

  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(appPath('/api/site-access/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password, remember }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Incorrect password')
        return
      }
      const target = from.startsWith('/') ? from : '/'
      router.replace(target)
      router.refresh()
    } catch {
      setError('Unable to verify password. Try again.')
    } finally {
      setLoading(false)
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
        <p className="mt-2 text-sm text-gray-400 text-center">
          Enter the site access password to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {error && (
            <p className="text-sm text-red-400 text-center" role="alert">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="site-access-password" className="sr-only">
              Site access password
            </label>
            <input
              id="site-access-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Site password"
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
            Remember on this device (30 days)
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function SiteAccessGatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-dark-900 text-gray-400">
          Loading...
        </div>
      }
    >
      <GateForm />
    </Suspense>
  )
}
