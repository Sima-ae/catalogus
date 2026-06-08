'use client'

import type { ReactNode } from 'react'

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
  return (
    <div
      className={`activity-speech-bubble-wrap relative inline-flex max-w-full min-w-0 rounded-xl border shadow-sm overflow-hidden ${
        compact ? 'activity-speech-bubble-wrap--compact' : ''
      } ${
        isDark
          ? 'bg-dark-800/95 border-dark-600 shadow-black/20'
          : 'bg-white border-gray-200 shadow-gray-200/80'
      } ${className}`.trim()}
      role="status"
      aria-live="polite"
      title={title}
    >
      <div className="flex items-stretch min-w-0 w-full">
        {children}
      </div>
    </div>
  )
}
