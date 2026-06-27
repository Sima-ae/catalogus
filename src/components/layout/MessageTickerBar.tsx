'use client'

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import { useTickerMessages } from '@/lib/ticker-messages-context'

const SEP = '     ·     '
const LOOP_SEP = SEP
const TICKER_SPEED_PX_PER_SEC = 42
const MIN_DURATION_SEC = 18
const MAX_DURATION_SEC = 160
const TICKER_CHARS_PER_PX = 0.18

function buildTickerSegment(base: string, minApproxChars: number): string {
  const core = base.trim()
  if (!core) return ''
  let out = core
  while (out.length < minApproxChars) {
    out = `${out}${SEP}${core}`
  }
  return out
}

function minCharsForViewport(viewportWidth: number): number {
  const w = Math.max(320, Math.min(viewportWidth || 1280, 3840))
  const targetPx = w * 2.6
  return Math.max(360, Math.min(4500, Math.round(targetPx * TICKER_CHARS_PER_PX)))
}

export default function MessageTickerBar() {
  const { locale } = useI18n()
  const { messages: bootstrapMessages } = useTickerMessages()
  const [items, setItems] = useState(bootstrapMessages)
  const [loaded, setLoaded] = useState(true)
  const trackRef = useRef<HTMLDivElement>(null)
  const [durationSec, setDurationSec] = useState(45)
  const [minRunChars, setMinRunChars] = useState(480)

  useEffect(() => {
    setItems(bootstrapMessages)
  }, [bootstrapMessages])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          appPath(`/api/site-ticker-messages?locale=${encodeURIComponent(locale)}`),
          { cache: 'no-store' }
        )
        const data = await res.json()
        const messages = Array.isArray(data?.messages) ? data.messages : []
        if (!cancelled) {
          setItems(messages)
          setLoaded(true)
        }
      } catch {
        if (!cancelled) {
          setItems([])
          setLoaded(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [locale])

  useLayoutEffect(() => {
    const bump = () => {
      if (typeof window === 'undefined') return
      setMinRunChars(minCharsForViewport(window.innerWidth))
    }
    bump()
    window.addEventListener('resize', bump)
    return () => window.removeEventListener('resize', bump)
  }, [])

  const joined = useMemo(() => {
    if (!items?.length) return ''
    return items.map((i) => i.text).join(SEP)
  }, [items])

  const segment = useMemo(() => buildTickerSegment(joined, minRunChars), [joined, minRunChars])
  const loopChunk = useMemo(() => `${segment}${LOOP_SEP}`, [segment])

  useLayoutEffect(() => {
    if (!segment) return
    const el = trackRef.current
    if (!el) return

    const measure = () => {
      const half = el.scrollWidth / 2
      if (half <= 0) return
      const sec = Math.min(
        MAX_DURATION_SEC,
        Math.max(MIN_DURATION_SEC, half / TICKER_SPEED_PX_PER_SEC)
      )
      setDurationSec(sec)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [loopChunk])

  if (!loaded) {
    return (
      <div
        className="message-ticker-bar relative h-10 w-full shrink-0"
        style={{ background: 'linear-gradient(to right, #3c2774, #2c5765)' }}
        aria-hidden
      />
    )
  }

  if (!items?.length || !joined || !segment) return null

  return (
    <div
      className="message-ticker-bar relative h-10 w-full overflow-hidden px-5 text-white shadow-inner sm:px-8"
      style={{ background: 'linear-gradient(to right, #3c2774, #2c5765)' }}
      role="marquee"
      aria-live="polite"
    >
      <div
        ref={trackRef}
        className="site-message-ticker-track"
        style={{ '--site-ticker-duration': `${durationSec}s` } as CSSProperties}
      >
        <span className="inline-flex shrink-0 items-center whitespace-nowrap text-xs font-medium tracking-wide sm:text-sm">
          {loopChunk}
        </span>
        <span
          className="inline-flex shrink-0 items-center whitespace-nowrap text-xs font-medium tracking-wide sm:text-sm"
          aria-hidden
        >
          {loopChunk}
        </span>
      </div>
    </div>
  )
}
