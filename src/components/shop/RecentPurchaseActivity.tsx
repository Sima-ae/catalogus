'use client'

import { useEffect, useState } from 'react'
import { CubeIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import { appPath } from '@/lib/paths'
import { productImageSrc } from '@/lib/product-image-url'
import ActivitySpeechBubble from '@/components/shop/ActivitySpeechBubble'
import {
  loadOrCreateDailySocialProofFeed,
  minutesSince,
  type SocialProofProduct,
  type StoredSocialProofNotification,
} from '@/lib/social-proof-activity'
import { useI18n } from '@/lib/i18n-context'

/** Slower rotation so lines do not flash by too quickly. */
const ROTATE_MS = 10_000
const TIME_TICK_MS = 30_000

type Props = {
  variant?: 'hero' | 'header'
  onVisibilityChange?: (visible: boolean) => void
}

function ActivityProductThumb({
  imageUrl,
  productName,
  compact,
  isDark,
}: {
  imageUrl: string | null | undefined
  productName: string
  compact?: boolean
  isDark: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = productImageSrc(imageUrl)

  useEffect(() => {
    setFailed(false)
  }, [src])
  const sizeClass = compact ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-11 h-11 sm:w-12 sm:h-12'
  const showImage = Boolean(src) && !failed

  return (
    <div
      className={`relative shrink-0 ${sizeClass} overflow-hidden ${
        isDark ? 'bg-dark-700' : 'bg-gray-100'
      }`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}
          aria-hidden
        >
          <CubeIcon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </div>
      )}
      <span className="sr-only">{productName}</span>
    </div>
  )
}

function ActivityLine({
  notification,
  isDark,
  compact,
  orderLine,
}: {
  notification: StoredSocialProofNotification
  isDark: boolean
  compact?: boolean
  orderLine: string
}) {
  const muted = isDark ? 'text-gray-400' : 'text-gray-500'
  const emphasis = isDark ? 'text-primary-300' : 'text-primary-700'

  return (
    <div
      className={`min-w-0 flex flex-col justify-center gap-0.5 flex-1 py-1 pr-2.5 sm:pr-3 ${
        compact ? 'pl-2 text-[11px] sm:text-xs' : 'pl-2.5 text-sm sm:text-base'
      }`}
    >
      <p className={`min-w-0 leading-tight truncate ${muted}`}>{orderLine}</p>
      <p className={`min-w-0 leading-tight truncate font-semibold ${emphasis}`}>
        {notification.productName}
      </p>
    </div>
  )
}

function formatMinutesAgoI18n(minutes: number, t: ReturnType<typeof useI18n>['t']): string {
  if (minutes < 1) return t('activity.time.justNow')
  if (minutes === 1) return t('activity.time.minuteAgo')
  if (minutes < 60) return t('activity.time.minutesAgo', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return t('activity.time.hourAgo')
  if (hours < 24) return t('activity.time.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days === 1) return t('activity.time.dayAgo')
  return t('activity.time.daysAgo', { count: days })
}

function formatOrderLine(
  buyer: string,
  minutes: number,
  t: ReturnType<typeof useI18n>['t']
): string {
  if (minutes < 1) {
    return t('activity.orderedJustNow', { buyer })
  }
  return t('activity.orderedWithTime', {
    buyer,
    time: formatMinutesAgoI18n(minutes, t),
  })
}

/** Rotating fictional purchase lines — random buyers, catalog products, daily persistence. */
export default function RecentPurchaseActivity({
  variant = 'hero',
  onVisibilityChange,
}: Props) {
  const isHeader = variant === 'header'
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { t } = useI18n()
  const [items, setItems] = useState<StoredSocialProofNotification[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [, setTimeTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch(appPath('/api/activity/social-proof'))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        const products: SocialProofProduct[] = Array.isArray(data?.products)
          ? data.products
              .map((p: { label?: string; imageUrl?: string | null; category?: string }) => ({
                label: String(p?.label ?? '').trim(),
                imageUrl: p?.imageUrl ? String(p.imageUrl) : null,
                category: p?.category ? String(p.category).trim() : undefined,
              }))
              .filter((p: SocialProofProduct) => Boolean(p.label))
          : []
        const feed = loadOrCreateDailySocialProofFeed(products)
        setItems(feed)
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isHeader) return
    onVisibilityChange?.(loading || items.length > 0)
  }, [isHeader, loading, items.length, onVisibilityChange])

  useEffect(() => {
    if (items.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length)
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [items.length])

  useEffect(() => {
    const id = window.setInterval(() => setTimeTick((n) => n + 1), TIME_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  if (loading) {
    return (
      <ActivitySpeechBubble isDark={isDark} compact={isHeader}>
        <div
          className={`shrink-0 animate-pulse ${isHeader ? 'w-9 h-9 sm:w-10 sm:h-10' : 'w-11 h-11'} ${
            isDark ? 'bg-dark-700' : 'bg-gray-200'
          }`}
          aria-hidden
        />
        <div className="flex flex-col gap-1 flex-1 py-2 pl-2 pr-3 animate-pulse" aria-hidden>
          <p className={`h-2.5 rounded w-24 ${isDark ? 'bg-dark-700' : 'bg-gray-200'}`} />
          <p className={`h-2.5 rounded w-full max-w-[9rem] ${isDark ? 'bg-dark-600' : 'bg-gray-100'}`} />
        </div>
      </ActivitySpeechBubble>
    )
  }

  if (items.length === 0) return null

  const current = items[index] ?? items[0]
  const minutesAgo = minutesSince(current.purchasedAt)
  const orderLine = formatOrderLine(current.buyerName, minutesAgo, t)
  const fullTitle = `${orderLine} ${current.productName}`

  return (
    <ActivitySpeechBubble isDark={isDark} compact={isHeader} title={fullTitle}>
      <ActivityProductThumb
        imageUrl={current.productImageUrl}
        productName={current.productName}
        compact={isHeader}
        isDark={isDark}
      />
      <ActivityLine
        notification={current}
        isDark={isDark}
        compact={isHeader}
        orderLine={orderLine}
      />
    </ActivitySpeechBubble>
  )
}
