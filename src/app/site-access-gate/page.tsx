'use client'

import { Suspense, useCallback } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useI18n } from '@/lib/i18n-context'
import {
  navigateAfterSiteAccessUnlock,
  resolveSiteAccessRedirect,
} from '@/lib/site-access-redirect'
import { useSyncLocaleFromPath } from '@/lib/use-sync-locale-from-path'
import SiteAccessGateForm from '@/components/site-access/SiteAccessGateForm'

function GateForm() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'
  useSyncLocaleFromPath(from)

  const handleSuccess = useCallback(() => {
    const target = resolveSiteAccessRedirect(from, pathname)
    navigateAfterSiteAccessUnlock(target)
  }, [from, pathname])

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-dark-900/95 backdrop-blur-sm px-4">
      <SiteAccessGateForm onSuccess={handleSuccess} />
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
