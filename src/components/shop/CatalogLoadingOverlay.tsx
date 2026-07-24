'use client'

import { useEffect, useRef, useState } from 'react'
import CatalogLoadingIndicator from '@/components/shop/CatalogLoadingIndicator'
import { useTheme } from '@/lib/theme'

type Props = {
  active: boolean
  message?: string
  /** Fired once if loading stays active too long — parent should clear stuck flags. */
  onStall?: () => void
  stallTimeoutMs?: number
}

const DEFAULT_STALL_MS = 55_000

/** Ease 0 → ~88% while loading; snap to 100% briefly when done. */
function useSimulatedLoadProgress(
  active: boolean,
  onStall?: () => void,
  stallTimeoutMs: number = DEFAULT_STALL_MS
): { percent: number; visible: boolean } {
  const [percent, setPercent] = useState(0)
  const [visible, setVisible] = useState(false)
  const activeRef = useRef(active)
  activeRef.current = active
  const onStallRef = useRef(onStall)
  onStallRef.current = onStall
  const stalledRef = useRef(false)

  useEffect(() => {
    if (!active) {
      stalledRef.current = false
      return
    }

    setVisible(true)
    setPercent(0)
    const start = Date.now()
    const id = window.setInterval(() => {
      if (!activeRef.current) return
      const elapsed = Date.now() - start
      const eased = Math.min(88, Math.round(88 * (1 - Math.exp(-elapsed / 5000))))
      setPercent(eased)
    }, 200)

    const stallId = window.setTimeout(() => {
      if (!activeRef.current || stalledRef.current) return
      stalledRef.current = true
      onStallRef.current?.()
    }, stallTimeoutMs)

    return () => {
      window.clearInterval(id)
      window.clearTimeout(stallId)
    }
  }, [active, stallTimeoutMs])

  useEffect(() => {
    if (active || !visible) return

    setPercent(100)
    const id = window.setTimeout(() => {
      // Only hide if we are still inactive — avoids getting stuck at 100% when
      // catalogFetching flickers during search + category navigation.
      if (!activeRef.current) {
        setVisible(false)
        setPercent(0)
      }
    }, 220)
    return () => window.clearTimeout(id)
  }, [active, visible])

  return { percent, visible: visible || active }
}

/** Full-viewport loading overlay — sits above the sticky header and message ticker. */
export default function CatalogLoadingOverlay({
  active,
  message,
  onStall,
  stallTimeoutMs,
}: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { percent, visible } = useSimulatedLoadProgress(active, onStall, stallTimeoutMs)

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="status"
      aria-live="polite"
      aria-busy={percent < 100}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-hidden />
      <div
        className={`relative w-full max-w-sm rounded-2xl border shadow-2xl ${
          isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
        }`}
      >
        <CatalogLoadingIndicator
          message={message}
          isDark={isDark}
          className="!py-10"
          percent={percent}
        />
      </div>
    </div>
  )
}
