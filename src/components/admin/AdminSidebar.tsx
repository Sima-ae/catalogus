'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { useTheme } from '@/lib/theme'
import { appPath, isAppPath } from '@/lib/paths'
import { APP_COPYRIGHT } from '@/lib/brand'
import BrandLogo from '@/components/brand/BrandLogo'
import RoleBadge from '@/components/users/RoleBadge'
import {
  HomeIcon,
  CubeIcon,
  ShoppingCartIcon,
  UsersIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  TagIcon,
  DocumentTextIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Products', href: '/admin/products', icon: CubeIcon },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCartIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Categories', href: '/admin/categories', icon: TagIcon },
  { name: 'Reviews', href: '/admin/reviews', icon: DocumentTextIcon },
  { name: 'Analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { name: 'Settings', href: '/admin/settings', icon: Cog6ToothIcon },
]

export function AdminMobileMenuButton({ onClick }: { onClick: () => void }) {
  const { theme } = useTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lg:hidden p-2 rounded-lg ${
        theme === 'dark' ? 'hover:bg-dark-700 text-white' : 'hover:bg-gray-100 text-gray-900'
      }`}
      aria-label="Open admin menu"
    >
      <Bars3Icon className="w-6 h-6" />
    </button>
  )
}

export default function AdminSidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean
  onMobileClose?: () => void
}) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const shellClass = isDark
    ? 'bg-dark-900 border-dark-800'
    : 'bg-white border-gray-200'
  const panelClass = isDark ? 'bg-dark-800' : 'bg-gray-100'
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600'
  const navIdle = isDark
    ? 'text-gray-300 hover:bg-dark-800 hover:text-white'
    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
  const borderClass = isDark ? 'border-dark-800' : 'border-gray-200'

  const sidebar = (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <BrandLogo size="dashboard" dashboardSidebar={isDark} priority />
        <div className="flex items-center gap-1 shrink-0">
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              className={`lg:hidden p-2 rounded-lg ${isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-100'}`}
              aria-label="Close"
            >
              <XMarkIcon className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
            </button>
          )}
        </div>
      </div>

      <div className={`mb-6 p-4 rounded-lg ${panelClass}`}>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="min-w-0">
            <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {user?.name || 'Admin User'}
            </p>
            {user && (
              <div className="mt-1">
                <RoleBadge role={user.role} email={user.email} is_super_admin={user.is_super_admin} />
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="space-y-2 flex-1">
        {navigation.map((item) => {
          const isActive = isAppPath(pathname, item.href)
          return (
            <Link
              key={item.name}
              href={appPath(item.href)}
              onClick={onMobileClose}
              className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                isActive ? 'nav-active' : navIdle
              }`}
            >
              <item.icon className="w-5 h-5 mr-3 shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className={`mt-6 pt-6 border-t ${borderClass}`}>
        <h3 className={`text-sm font-medium mb-3 ${mutedText}`}>Quick Actions</h3>
        <div className="space-y-2">
          <Link
            href={appPath('/admin/products/new')}
            onClick={onMobileClose}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${navIdle}`}
          >
            <CubeIcon className="w-4 h-4 mr-3" />
            Add Product
          </Link>
          <Link
            href={appPath('/admin/categories/new')}
            onClick={onMobileClose}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${navIdle}`}
          >
            <TagIcon className="w-4 h-4 mr-3" />
            Add Category
          </Link>
        </div>
      </div>

      <div className={`mt-6 pt-6 border-t text-xs ${borderClass} ${mutedText}`}>
        <div className="space-y-2">
          <Link
            href={appPath('/')}
            onClick={onMobileClose}
            className={`block transition-colors ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}
          >
            Visit Site
          </Link>
          <Link
            href={appPath('/admin/settings')}
            onClick={onMobileClose}
            className={`block transition-colors ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}
          >
            Settings
          </Link>
        </div>
        <div className="mt-4">
          <p>
            <b>{APP_COPYRIGHT}</b>
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close overlay"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={`sidebar z-50 border-r ${shellClass}
          fixed inset-y-0 left-0 w-[min(100vw-3rem,16rem)] sm:w-64
          lg:static lg:translate-x-0 lg:w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform duration-300`}
      >
        {sidebar}
      </aside>
    </>
  )
}
