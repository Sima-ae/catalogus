'use client'

import { useEffect, useRef } from 'react'
import CatalogLoadingIndicator from '@/components/shop/CatalogLoadingIndicator'

type Props = {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
}

/** Triggers catalog batch fetch when the user scrolls near the product grid bottom. */
export default function CatalogLoadMoreSentinel({ hasMore, loading, onLoadMore }: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const onLoadMoreRef = useRef(onLoadMore)

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    if (!hasMore || loading) return

    const node = sentinelRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current()
        }
      },
      { rootMargin: '400px 0px', threshold: 0 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, loading])

  if (!hasMore && !loading) return null

  return (
    <div ref={sentinelRef} className="flex justify-center py-6" aria-live="polite">
      {loading ? <CatalogLoadingIndicator compact className="!py-0" /> : null}
    </div>
  )
}
