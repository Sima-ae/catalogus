'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="lg:hidden p-2 rounded-lg hover:bg-dark-700 text-white"
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

  const sidebar = (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <BrandLogo size="dashboard" dashboardSidebar priority />
        {onMobileClose && (
          <button type="button" onClick={onMobileClose} className="lg:hidden p-2 hover:bg-dark-700 rounded-lg" aria-label="Close">
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      <div className="mb-6 p-4 bg-dark-700 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-lg">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'A'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-medium truncate">{user?.name || 'Admin User'}</p>
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
                isActive ? 'nav-active' : 'text-gray-300 hover:bg-dark-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3 shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 pt-6 border-t border-dark-700">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <Link
            href={appPath('/admin/products/new')}
            onClick={onMobileClose}
            className="flex items-center px-3 py-2 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors text-sm"
          >
            <CubeIcon className="w-4 h-4 mr-3" />
            Add Product
          </Link>
          <Link
            href={appPath('/admin/categories/new')}
            onClick={onMobileClose}
            className="flex items-center px-3 py-2 rounded-lg text-gray-300 hover:bg-dark-700 hover:text-white transition-colors text-sm"
          >
            <TagIcon className="w-4 h-4 mr-3" />
            Add Category
          </Link>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-dark-700 text-xs text-gray-400">
        <div className="space-y-2">
          <Link href={appPath('/')} onClick={onMobileClose} className="block hover:text-white transition-colors">
            Visit Site
          </Link>
          <Link
            href={appPath('/admin/settings')}
            onClick={onMobileClose}
            className="block hover:text-white transition-colors"
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
        className={`sidebar z-50 bg-dark-800 border-r border-dark-700
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
