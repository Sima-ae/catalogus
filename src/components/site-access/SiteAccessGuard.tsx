'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { appPath } from '@/lib/paths'
import { isPricelistSharePath } from '@/lib/pricelist-share-path'
import { useI18n } from '@/lib/i18n-context'
import {
  navigateAfterSiteAccessUnlock,
  resolveSiteAccessRedirect,
} from '@/lib/site-access-redirect'
import { SITE_ACCESS_META_REQUIRED } from '@/lib/site-access-cookie'

type Status = { required: boolean; unlocked: boolean }

function readSiteAccessHint(): Status | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie
  const requiredMatch = cookies.match(
    new RegExp(`(?:^|;\\s*)${SITE_ACCESS_META_REQUIRED.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`)
  )
  const requiredFlag = requiredMatch?.[1]

  if (requiredFlag === '0') {
    return { required: false, unlocked: true }
  }

  // Middleware already passed — render immediately while status is confirmed in the background.
  if (requiredFlag === '1') {
    return { required: true, unlocked: true }
  }

  return null
}

/**
 * Client-side backup: blocks UI until site access cookie is set (e.g. client navigations).
 * Middleware handles hard refreshes and API routes.
 */
export default function SiteAccessGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const [status, setStatus] = useState<Status | null>(() => readSiteAccessHint())

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
  }, [])

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
        {t('loading.generic')}
      </div>
    )
  }

  return <>{children}</>
}
