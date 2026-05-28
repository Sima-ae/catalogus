'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { appPath } from '@/lib/paths'
import BrandLogo from '@/components/brand/BrandLogo'
import { ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'

type NavItem = { name: string; href: string }

interface DashboardShellProps {
  title: string
  nav: NavItem[]
  children: React.ReactNode
}

export default function DashboardShell({ title, nav, children }: DashboardShellProps) {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const aside = (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <BrandLogo />
        <button
          type="button"
          className="lg:hidden p-2 hover:bg-dark-700 rounded-lg"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <XMarkIcon className="w-5 h-5 text-white" />
        </button>
      </div>
      <p className="text-sm text-gray-400 mb-4 lg:hidden">{title}</p>
      <div className="mb-6 p-4 bg-dark-700 rounded-lg">
        <p className="text-white font-medium truncate">{user?.name || 'User'}</p>
        <p className="text-gray-400 text-sm capitalize">{user?.role}</p>
        <p className="text-gray-500 text-xs mt-1 truncate">{user?.email}</p>
      </div>
      <nav className="space-y-2 flex-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`block px-3 py-2 rounded-lg transition-colors text-sm sm:text-base ${
              pathname === item.href ? 'nav-active' : 'text-gray-300 hover:bg-dark-700 hover:text-white'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
      <div className="mt-6 pt-6 border-t border-dark-700 space-y-2">
        <Link href={appPath('/')} onClick={() => setMobileOpen(false)} className="block text-sm text-gray-400 hover:text-white">
          Visit shop
        </Link>
        <button
          type="button"
          onClick={() => signOut().then(() => { window.location.href = appPath('/login') })}
          className="flex items-center text-sm text-gray-400 hover:text-white"
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-dark-900 overflow-x-hidden">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar z-50 border-r border-dark-700 bg-dark-800
          fixed inset-y-0 left-0 w-[min(100vw-3rem,16rem)] sm:w-64
          lg:static lg:translate-x-0 lg:w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300`}
      >
        {aside}
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-2 p-4 border-b border-dark-700">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-dark-700 text-white"
            aria-label="Open menu"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <span className="text-white font-semibold">{title}</span>
        </div>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
