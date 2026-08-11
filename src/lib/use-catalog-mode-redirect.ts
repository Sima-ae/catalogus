'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useShopCommerce } from '@/hooks/use-shop-commerce'
import { appPath } from '@/lib/paths'

/** Send visitors away from cart/checkout when this host disallows commerce. */
export function useCatalogModeRedirect(redirectTo = '/') {
  const router = useRouter()
  const { ready, checkoutAllowed } = useShopCommerce()

  useEffect(() => {
    if (ready && !checkoutAllowed) {
      router.replace(appPath(redirectTo))
    }
  }, [ready, checkoutAllowed, router, redirectTo])

  return {
    catalogMode: !checkoutAllowed,
    ready,
    blocked: ready && !checkoutAllowed,
  }
}
