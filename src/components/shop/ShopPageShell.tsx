'use client'

import { ReactNode, useState } from 'react'
import Sidebar, { MobileMenuButton } from '@/components/layout/Sidebar'
import { useTheme } from '@/lib/theme'
import ThemeToggleButton from '@/components/theme/ThemeToggleButton'
import ShopCartHeaderButton from '@/components/shop/ShopCartHeaderButton'

type ShopPageShellProps = {
  title: string
  subtitle?: string
  children: ReactNode
}

export default function ShopPageShell({ title, subtitle, children }: ShopPageShellProps) {
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
              <ShopCartHeaderButton
                className={`relative p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-200'
                }`}
              />
            </div>
          </div>
        </header>

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden app-readable ${shellBg}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
