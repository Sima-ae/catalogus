'use client'

import { useEffect, useState } from 'react'
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
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [busy, setBusy] = useState(false)
  const [localFeatured, setLocalFeatured] = useState(featured)

  useEffect(() => {
    setLocalFeatured(featured)
  }, [featured, productId])

  if (authLoading || !user || !isAdmin) return null

  const iconClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
  const on = localFeatured

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return

    const next = !on
    setBusy(true)
    setLocalFeatured(next)
    try {
      const res = await fetch(appPath('/api/admin/products/bulk-update'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: [productId], featured: next }),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) {
        throw new Error(data.error || t('product.featured.error'))
      }
      onSaved?.({ productId, featured: next })
    } catch {
      setLocalFeatured(on)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      disabled={busy}
      className={
        on
          ? `rounded-full p-1.5 bg-black hover:bg-black text-white transition-colors disabled:opacity-50 ${className}`
          : `rounded-full p-1.5 bg-black/50 hover:bg-black/70 text-white transition-colors disabled:opacity-50 ${className}`
      }
      aria-label={on ? t('product.featured.clearAria') : t('product.featured.setAria')}
      title={on ? t('product.featured.clearTitle') : t('product.featured.setTitle')}
      aria-pressed={on}
    >
      {on ? (
        <StarIconSolid className={iconClass} />
      ) : (
        <StarIcon className={iconClass} />
      )}
    </button>
  )
}
