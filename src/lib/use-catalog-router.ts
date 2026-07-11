'use client'

import { useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'

/** Non-blocking App Router replace — keeps pills responsive during filter changes. */
export function useCatalogRouterReplace() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const replace = useCallback(
    (href: string) => {
      startTransition(() => {
        router.replace(href, { scroll: false })
      })
    },
    [router]
  )

  return { replace, isPending }
}
