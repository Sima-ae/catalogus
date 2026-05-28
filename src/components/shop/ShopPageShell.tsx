'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import Sidebar, { MobileMenuButton } from '@/components/layout/Sidebar'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import ThemeToggleButton from '@/components/theme/ThemeToggleButton'
import { appPath } from '@/lib/paths'

type ShopPageShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function ShopPageShell({ title, subtitle, children }: ShopPageShellProps) {
  const { state: cartState } = useCart()
  const { theme } = useTheme()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const isDark = theme === 'dark'
  const shellBg = isDark ? 'bg-dark-900' : 'bg-gray-50'
  const headerBg = isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
  const titleColor = isDark ? 'text-white' : 'text-gray-900'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${shellBg} overflow-x-hidden`}>
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`border-b px-4 sm:px-6 lg:px-8 py-4 ${headerBg}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <MobileMenuButton onClick={() => setMobileNavOpen(true)} />
              <div className="min-w-0">
                <h1 className={`text-lg sm:text-xl font-bold truncate ${titleColor}`}>{title}</h1>
                {subtitle && <p className={`text-sm truncate ${muted}`}>{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ThemeToggleButton />
              <Link
                href={appPath('/cart')}
                className={`relative p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-200'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                {cartState.itemCount > 0 && (
                  <span className="cart-badge">{cartState.itemCount > 99 ? '99+' : cartState.itemCount}</span>
                )}
              </Link>
            </div>
          </div>
        </header>

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden ${shellBg}`}>{children}</main>
      </div>
    </div>
  )
}
