'use client'

import { useTheme } from '@/lib/theme'
import {
  SparklesIcon,
  FireIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline'
import type { ComponentType } from 'react'
import type { ShopHeroIcon } from '@/components/shop/ShopHeroBanner'

const ICONS: Record<ShopHeroIcon, ComponentType<{ className?: string }>> = {
  sparkles: SparklesIcon,
  fire: FireIcon,
  bag: ShoppingBagIcon,
}

type ShopCatalogBadgeProps = {
  label: string
  icon?: ShopHeroIcon
  /** Sidebar collapsed: icon only */
  iconOnly?: boolean
  className?: string
}

/** Pill label shown above category tabs (outside the hero banner). */
export default function ShopCatalogBadge({
  label,
  icon = 'sparkles',
  iconOnly = false,
  className = '',
}: ShopCatalogBadgeProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const text = label.trim()
  if (!text) return null

  const Icon = ICONS[icon]

  return (
    <div className={className.trim() || undefined}>
    <span
      title={iconOnly ? text : undefined}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
        isDark
          ? 'border-gray-600 text-gray-300 bg-dark-900'
          : 'border-gray-300 text-gray-700 bg-white'
      }`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {!iconOnly && text}
    </span>
    </div>
  )
}
