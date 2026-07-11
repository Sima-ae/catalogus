'use client'

import { useEffect, useRef, useState } from 'react'
import CatalogLoadingIndicator from '@/components/shop/CatalogLoadingIndicator'
import { useTheme } from '@/lib/theme'

type Props = {
  active: boolean
  message?: string
}

/** Ease 0 → ~92% while loading; snap to 100% briefly when done. */
function useSimulatedLoadProgress(active: boolean): { percent: number; visible: boolean } {
  const [percent, setPercent] = useState(0)
  const [visible, setVisible] = useState(false)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    if (!active) return

    setVisible(true)
    setPercent(0)
    const start = Date.now()
    const id = window.setInterval(() => {
      if (!activeRef.current) return
      const elapsed = Date.now() - start
      const eased = Math.min(92, Math.round(92 * (1 - Math.exp(-elapsed / 3500))))
      setPercent(eased)
    }, 80)

    return () => window.clearInterval(id)
  }, [active])

  useEffect(() => {
    if (active || !visible) return

    setPercent(100)
    const id = window.setTimeout(() => {
      setVisible(false)
      setPercent(0)
    }, 220)
    return () => window.clearTimeout(id)
  }, [active, visible])

  return { percent, visible: visible || active }
}

/** Full-viewport loading overlay — sits above the sticky header and message ticker. */
export default function CatalogLoadingOverlay({ active, message }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { percent, visible } = useSimulatedLoadProgress(active)

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-busy={percent < 100}
      aria-live="polite"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
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
