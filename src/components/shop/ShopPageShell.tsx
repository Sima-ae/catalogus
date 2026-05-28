'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import Sidebar, { MobileMenuButton } from '@/components/layout/Sidebar'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import { appPath } from '@/lib/paths'

type ShopPageShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function ShopPageShell({ title, subtitle, children }: ShopPageShellProps) {
  const { state: cartState } = useCart()
  const { theme, toggleTheme } = useTheme()
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
              <button
                type="button"
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'text-gray-400 hover:text-white hover:bg-dark-700' : 'text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>
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
