'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { appPath } from '@/lib/paths'
import { isPricelistSharePath } from '@/lib/pricelist-share-path'
import { useI18n } from '@/lib/i18n-context'
import {
  navigateAfterSiteAccessUnlock,
  resolveSiteAccessRedirect,
} from '@/lib/site-access-redirect'
import { SITE_ACCESS_META_REQUIRED } from '@/lib/site-access-cookie'
import { useSiteAccessInactivity } from '@/hooks/useSiteAccessInactivity'
import SiteAccessInactivityModal from '@/components/site-access/SiteAccessInactivityModal'

type Status = { required: boolean; unlocked: boolean }

/** Site access disabled — safe to skip the status round-trip. */
function readSiteAccessDisabledHint(): Status | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie
  const requiredMatch = cookies.match(
    new RegExp(`(?:^|;\\s*)${SITE_ACCESS_META_REQUIRED.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`)
  )
  const requiredFlag = requiredMatch?.[1]

  if (requiredFlag === '0') {
    return { required: false, unlocked: true }
  }

  return null
}

function initialStatus(): Status | null {
  return readSiteAccessDisabledHint()
}

async function fetchSiteAccessStatus(): Promise<Status> {
  const res = await fetch(appPath('/api/site-access/status'), {
    credentials: 'include',
    cache: 'no-store',
  })
  const data = await res.json()
  return {
    required: Boolean(data.required),
    unlocked: Boolean(data.unlocked),
  }
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
  const [status, setStatus] = useState<Status | null>(initialStatus)
  const redirectingRef = useRef(false)

  const gatePath = appPath('/site-access-gate')
  const onGate =
    pathname === gatePath || pathname?.endsWith('/site-access-gate')

  const pricelistShare = isPricelistSharePath(pathname || '', searchParams.get('owner'))

  const inactivityEnabled =
    Boolean(status?.required && status?.unlocked && !onGate && !pricelistShare)

  const handleInactivityLock = useCallback(() => {
    setStatus((prev) => (prev ? { ...prev, unlocked: false } : prev))
  }, [])

  const { inactivityLocked, resumeAfterUnlock } = useSiteAccessInactivity(inactivityEnabled, {
    onLock: handleInactivityLock,
  })

  useEffect(() => {
    let cancelled = false

    void fetchSiteAccessStatus()
      .then((next) => {
        if (!cancelled) setStatus(next)
      })
      .catch(() => {
        if (!cancelled) setStatus({ required: false, unlocked: true })
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (status === null) return

    if (onGate) {
      if (status.unlocked) {
        const target = resolveSiteAccessRedirect(searchParams.get('from'), pathname)
        navigateAfterSiteAccessUnlock(target)
      }
      return
    }

    if (
      status.required &&
      !status.unlocked &&
      !pricelistShare &&
      !inactivityLocked
    ) {
      if (redirectingRef.current) return
      redirectingRef.current = true
      const from = pathname || '/'
      router.replace(`${gatePath}?from=${encodeURIComponent(from)}`)
    } else {
      redirectingRef.current = false
    }
  }, [status, onGate, pathname, router, gatePath, searchParams, pricelistShare, inactivityLocked])

  const handleInactivityUnlock = useCallback(async () => {
    resumeAfterUnlock()
    try {
      const next = await fetchSiteAccessStatus()
      setStatus(next)
    } catch {
      setStatus((prev) => (prev ? { ...prev, unlocked: true } : prev))
    }
  }, [resumeAfterUnlock])

  if (onGate && status === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (
    status !== null &&
    status.required &&
    !status.unlocked &&
    !onGate &&
    !pricelistShare &&
    !inactivityLocked
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900 text-gray-400">
        {t('loading.generic')}
      </div>
    )
  }

  return (
    <>
      {children}
      {inactivityLocked ? (
        <SiteAccessInactivityModal onUnlock={handleInactivityUnlock} />
      ) : null}
    </>
  )
}
