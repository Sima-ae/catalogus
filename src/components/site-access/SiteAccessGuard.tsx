'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { appPath } from '@/lib/paths'
import { isPricelistSharePath } from '@/lib/pricelist-share-path'
import {
  navigateAfterSiteAccessUnlock,
  resolveSiteAccessRedirect,
} from '@/lib/site-access-redirect'

type Status = { required: boolean; unlocked: boolean }

/**
 * Client-side backup: blocks UI until site access cookie is set (e.g. client navigations).
 * Middleware handles hard refreshes and API routes.
 */
export default function SiteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<Status | null>(null)

  const gatePath = appPath('/site-access-gate')
  const onGate =
    pathname === gatePath || pathname?.endsWith('/site-access-gate')

  useEffect(() => {
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
  }, [pathname])

  const pricelistShare = isPricelistSharePath(pathname || '', searchParams.get('owner'))

  useEffect(() => {
    if (!status) return

    if (onGate) {
      if (!status.required || status.unlocked) {
        const target = resolveSiteAccessRedirect(searchParams.get('from'), pathname)
        navigateAfterSiteAccessUnlock(target)
      }
      return
    }

    if (status.required && !status.unlocked && !pricelistShare) {
      const from = pathname || '/'
      router.replace(`${gatePath}?from=${encodeURIComponent(from)}`)
    }
  }, [status, onGate, pathname, router, gatePath, searchParams, pricelistShare])

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (status.required && !status.unlocked && !onGate && !pricelistShare) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 text-gray-400">
        Redirecting...
      </div>
    )
  }

  return <>{children}</>
}
