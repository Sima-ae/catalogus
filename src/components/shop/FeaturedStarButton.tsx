'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StarIcon } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import { parseJsonResponse } from '@/lib/fetch-json'
import { useI18n } from '@/lib/i18n-context'

export type ProductFeaturedSaved = {
  productId: string
  featured: boolean
}

type Props = {
  productId: string
  featured?: boolean
  size?: 'sm' | 'md'
  className?: string
  onSaved?: (saved: ProductFeaturedSaved) => void
}

/**
 * Admin-only star: toggles products.featured (Uitgelicht → 1-1.club).
 * Buyers keep using PricelistStarButton; pricelist pages are unchanged.
 */
export default function FeaturedStarButton({
  productId,
  featured = false,
  size = 'md',
  className = '',
  onSaved,
}: Props) {
  const { t } = useI18n()
  const router = useRouter()
  const { user, isAdmin, loading: authLoading, signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const [localFeatured, setLocalFeatured] = useState(featured)
  const [error, setError] = useState('')

  useEffect(() => {
    setLocalFeatured(featured)
  }, [featured, productId])

  if (authLoading || !user || !isAdmin) return null

  const iconClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
  const on = localFeatured

  const stopCardGesture = (e: React.SyntheticEvent) => {
    e.stopPropagation()
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return

    const next = !on
    const previous = on
    setBusy(true)
    setError('')
    setLocalFeatured(next)
    try {
      const res = await fetch(appPath('/api/admin/products/bulk-update'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({ productIds: [productId], featured: next }),
      })
      const data = await parseJsonResponse<{ error?: string; updated?: number }>(res)
      if (res.status === 401 || res.status === 403) {
        setLocalFeatured(previous)
        setError(t('product.featured.authRequired'))
        try {
          await signOut()
        } catch {
          // ignore
        }
        router.push(appPath('/login'))
        return
      }
      if (!res.ok) {
        throw new Error(data.error || t('product.featured.error'))
      }
      onSaved?.({ productId, featured: next })
    } catch (err) {
      setLocalFeatured(previous)
      setError(err instanceof Error && err.message ? err.message : t('product.featured.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="relative"
      data-no-reorder
      onPointerDown={stopCardGesture}
      onTouchStart={stopCardGesture}
    >
      <button
        type="button"
        onClick={(e) => void handleClick(e)}
        onPointerDown={stopCardGesture}
        onTouchStart={stopCardGesture}
        disabled={busy}
        className={
          on
            ? `rounded-full p-1.5 bg-black hover:bg-black text-white transition-colors disabled:opacity-50 touch-manipulation ${className}`
            : `rounded-full p-1.5 bg-black/50 hover:bg-black/70 text-white transition-colors disabled:opacity-50 touch-manipulation ${className}`
        }
        aria-label={on ? t('product.featured.clearAria') : t('product.featured.setAria')}
        title={
          error
            ? error
            : on
              ? t('product.featured.clearTitle')
              : t('product.featured.setTitle')
        }
        aria-pressed={on}
        aria-busy={busy}
      >
        {on ? (
          <StarIconSolid className={iconClass} />
        ) : (
          <StarIcon className={iconClass} />
        )}
      </button>
      {error ? (
        <span className="pointer-events-none absolute bottom-full right-0 mb-1 max-w-[11rem] rounded bg-red-600 px-2 py-1 text-[10px] font-medium leading-tight text-white shadow-lg">
          {error}
        </span>
      ) : null}
    </div>
  )
}
