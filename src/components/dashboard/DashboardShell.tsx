'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { useTheme } from '@/lib/theme'
import { appPath } from '@/lib/paths'
import BrandLogo from '@/components/brand/BrandLogo'
import RoleBadge from '@/components/users/RoleBadge'
import UserStarRating from '@/components/users/UserStarRating'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import DashboardHeaderActions from '@/components/dashboard/DashboardHeaderActions'
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
  const { theme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isDark = theme === 'dark'
  const shellClass = isDark ? 'bg-dark-900 border-dark-800' : 'bg-white border-gray-200'
  const panelClass = isDark ? 'bg-dark-800' : 'bg-gray-100'
  const borderClass = isDark ? 'border-dark-800' : 'border-gray-200'
  const navIdle = isDark
    ? 'text-gray-300 hover:bg-dark-800 hover:text-white'
    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'

  const aside = (
    <div className="p-4 sm:p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 gap-2">
        <BrandLogo size="dashboard" dashboardSidebar={isDark} priority />
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            className={`lg:hidden p-2 rounded-lg ${isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <XMarkIcon className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
          </button>
        </div>
      </div>
      <p className={`text-sm mb-4 lg:hidden ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{title}</p>
      <div className={`mb-6 p-4 rounded-lg ${panelClass}`}>
        <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {user?.name || 'User'}
        </p>
        {user && (
          <div className="mt-2">
            <RoleBadge role={user.role} email={user.email} is_super_admin={user.is_super_admin} />
          </div>
        )}
        <div className="mt-2">
          <UserStarRating rating={user?.badge_rating} size="sm" showValue={false} />
        </div>
        <p className={`text-xs mt-2 truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{user?.email}</p>
      </div>
      <nav className="space-y-2 flex-1">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={appPath(item.href)}
            onClick={() => setMobileOpen(false)}
            className={`block px-3 py-2 rounded-lg transition-colors text-sm sm:text-base ${
              pathname === appPath(item.href) || pathname === item.href ? 'nav-active' : navIdle
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
      <div className={`mt-6 pt-6 border-t space-y-2 ${borderClass}`}>
        <Link
          href={appPath('/')}
          onClick={() => setMobileOpen(false)}
          className={`block text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Visit shop
        </Link>
        <button
          type="button"
          onClick={() => signOut().then(() => { window.location.href = appPath('/login') })}
          className={`flex items-center text-sm transition-colors ${
            isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div
      className={`flex min-h-screen overflow-x-hidden transition-colors duration-200 ${
        isDark ? 'bg-dark-950' : 'bg-gray-50'
      }`}
    >
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar z-50 border-r ${shellClass}
          fixed inset-y-0 left-0 w-[min(100vw-3rem,16rem)] sm:w-64
          lg:static lg:translate-x-0 lg:w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300`}
      >
        {aside}
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <AppStickyHeader
          title={title}
          showSocialProof
          showSearch={false}
          leading={
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={`p-2 rounded-lg lg:hidden ${isDark ? 'hover:bg-dark-700 text-white' : 'hover:bg-gray-100 text-gray-900'}`}
              aria-label="Open menu"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>
          }
          actions={<DashboardHeaderActions />}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-auto app-readable">{children}</main>
      </div>
    </div>
  )
}
