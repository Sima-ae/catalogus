'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { appPath } from '@/lib/paths'

type Status = { required: boolean; unlocked: boolean }

/**
 * Client-side backup: blocks UI until site access cookie is set (e.g. client navigations).
 * Middleware handles hard refreshes and API routes.
 */
export default function SiteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [status, setStatus] = useState<Status | null>(null)

  const gatePath = appPath('/site-access-gate')

  useEffect(() => {
    if (pathname === gatePath || pathname?.endsWith('/site-access-gate')) {
      setStatus({ required: true, unlocked: false })
      return
    }

    let cancelled = false
    fetch(appPath('/api/site-access/status'), { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json()
        if (!cancelled) setStatus(data)
      })
      .catch(() => {
        if (!cancelled) setStatus({ required: false, unlocked: true })
      })

    return () => {
      cancelled = true
    }
  }, [pathname, gatePath])

  useEffect(() => {
    if (!status?.required || status.unlocked) return
    if (pathname === gatePath || pathname?.endsWith('/site-access-gate')) return
    const from = pathname || '/'
    router.replace(`${gatePath}?from=${encodeURIComponent(from)}`)
  }, [status, pathname, router, gatePath])

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (status.required && !status.unlocked) {
    if (pathname === gatePath || pathname?.endsWith('/site-access-gate')) {
      return <>{children}</>
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 text-gray-400">
        Redirecting...
      </div>
    )
  }

  return <>{children}</>
}
