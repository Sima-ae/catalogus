'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme'
import { appPath } from '@/lib/paths'
import ActivitySpeechBubble from '@/components/shop/ActivitySpeechBubble'
import {
  loadOrCreateDailySocialProofFeed,
  minutesSince,
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

function ActivityLine({
  notification,
  minutesAgo,
  isDark,
  compact,
  prefix,
  timeLabel,
}: {
  notification: StoredSocialProofNotification
  minutesAgo: number
  isDark: boolean
  compact?: boolean
  prefix: string
  timeLabel: string
}) {
  const muted = isDark ? 'text-gray-300' : 'text-gray-600'
  const emphasis = isDark ? 'text-white' : 'text-gray-900'

  return (
    <p
      className={`min-w-0 leading-snug ${
        compact ? 'text-xs sm:text-sm truncate' : 'text-sm sm:text-base'
      } ${muted}`}
    >
      <span>{prefix}</span>
      <span className={`font-semibold ${emphasis}`}>{notification.productName}</span>
      <span> — {timeLabel}</span>
    </p>
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
        const names = Array.isArray(data?.productNames) ? data.productNames : []
        const feed = loadOrCreateDailySocialProofFeed(names)
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
    const id = window.setInterval(() => setTimeTick((t) => t + 1), TIME_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  if (loading) {
    return (
      <ActivitySpeechBubble isDark={isDark} compact={isHeader}>
        <p
          className={`animate-pulse ${isHeader ? 'text-xs sm:text-sm' : 'text-sm'} ${
            isDark ? 'text-gray-500' : 'text-gray-400'
          }`}
          aria-hidden
        >
          …
        </p>
      </ActivitySpeechBubble>
    )
  }

  if (items.length === 0) return null

  const current = items[index] ?? items[0]
  const minutesAgo = minutesSince(current.purchasedAt)
  const timeLabel = formatMinutesAgoI18n(minutesAgo, t)
  const prefix = t('activity.justOrderedPrefix', { buyer: current.buyerName })
  const fullTitle = `${prefix}${current.productName} — ${timeLabel}`

  return (
    <ActivitySpeechBubble isDark={isDark} compact={isHeader} title={fullTitle}>
      <ActivityLine
        notification={current}
        minutesAgo={minutesAgo}
        isDark={isDark}
        compact={isHeader}
        prefix={prefix}
        timeLabel={timeLabel}
      />
    </ActivitySpeechBubble>
  )
}
