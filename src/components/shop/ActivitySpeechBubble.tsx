'use client'

import type { ReactNode } from 'react'

/** Wide speech outline with tail bottom-left — taller for two text rows. */
const BUBBLE_VIEWBOX = '0 0 310 68'
const BUBBLE_PATH =
  'M 18 4 H 292 Q 304 4 304 16 V 46 Q 304 58 292 58 H 28 L 10 63 L 20 58 H 18 Q 6 58 6 46 V 16 Q 6 4 18 4 Z'

type ActivitySpeechBubbleProps = {
  children: ReactNode
  isDark: boolean
  compact?: boolean
  className?: string
  title?: string
}

export default function ActivitySpeechBubble({
  children,
  isDark,
  compact = false,
  className = '',
  title,
}: ActivitySpeechBubbleProps) {
  const stroke = isDark ? '#9ca3af' : '#171717'

  return (
    <div
      className={`activity-speech-bubble-wrap relative inline-block max-w-full min-w-0 ${className}`.trim()}
      role="status"
      aria-live="polite"
      title={title}
    >
      <svg
        className="absolute inset-0 h-full w-full pointer-events-none"
        viewBox={BUBBLE_VIEWBOX}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={BUBBLE_PATH}
          fill="none"
          stroke={stroke}
          strokeWidth="1.75"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div
        className={`relative z-[1] min-w-[10rem] max-w-full ${
          compact ? 'px-3.5 pt-2 pb-3 min-h-[3.25rem]' : 'px-4 pt-2.5 pb-3.5 min-h-[3.75rem]'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
