'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { appPath } from '@/lib/paths'

/** Send visitors away from cart/checkout when catalog mode is on. */
export function useCatalogModeRedirect(redirectTo = '/') {
  const router = useRouter()
  const { catalogMode, ready } = useCatalogMode()

  useEffect(() => {
    if (ready && catalogMode) {
      router.replace(appPath(redirectTo))
    }
  }, [ready, catalogMode, router, redirectTo])

  return { catalogMode, ready, blocked: ready && catalogMode }
}
