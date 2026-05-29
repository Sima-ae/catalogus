'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { useTheme } from '@/lib/theme'
import { appPath } from '@/lib/paths'

type Props = {
  /** Override badge count (e.g. current product qty on product page). */
  badgeCount?: number
  className?: string
  title?: string
}

export default function ShopCartHeaderButton({
  badgeCount,
  className,
  title = 'Shopping Cart',
}: Props) {
  const { catalogMode } = useCatalogMode()
  const { state: cartState } = useCart()
  const { theme } = useTheme()

  if (catalogMode) return null

  const count = badgeCount ?? cartState.itemCount
  const isDark = theme === 'dark'
  const linkClass =
    className ??
    `relative p-2 rounded-lg transition-colors duration-200 ${
      isDark
        ? 'text-gray-400 hover:text-white hover:bg-dark-800'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
    }`

  return (
    <Link href={appPath('/cart')} className={linkClass} title={title}>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-medium">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
