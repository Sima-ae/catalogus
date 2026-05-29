'use client'

import type { ReactNode } from 'react'

/** Wide speech outline with tail bottom-left — matches reference bubble shape. */
const BUBBLE_PATH =
  'M 18 4 H 292 Q 304 4 304 16 V 30 Q 304 42 292 42 H 28 L 10 47 L 20 42 H 18 Q 6 42 6 30 V 16 Q 6 4 18 4 Z'

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
        viewBox="0 0 310 52"
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
          compact ? 'px-3.5 py-2 pb-2.5' : 'px-4 py-2.5 pb-3'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
