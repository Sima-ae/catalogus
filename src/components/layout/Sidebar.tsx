'use client'

import { Suspense, useState, useCallback } from 'react'

export function useMobileSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const open = useCallback(() => setMobileOpen(true), [])
  const close = useCallback(() => setMobileOpen(false), [])
  return { mobileOpen, open, close }
}
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import { APP_COPYRIGHT } from '@/lib/brand'
import { appPath } from '@/lib/paths'
import BrandLogo from '@/components/brand/BrandLogo'
import SidebarCategories from '@/components/layout/SidebarCategories'
import {
  HomeIcon,
  MapIcon,
  CubeIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  PhoneIcon,
  Cog6ToothIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'New', href: '/new', icon: MapIcon },
  { name: 'Most Popular', href: '/popular', icon: CubeIcon },
]

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Become a Buyer', href: '/buyer', icon: ShoppingBagIcon },
  { name: 'Become a Seller', href: '/seller', icon: UserGroupIcon },
  { name: 'Contact', href: '/contact', icon: PhoneIcon },
]

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  const { theme } = useTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`lg:hidden p-2 rounded-lg transition-colors ${
        theme === 'dark' ? 'hover:bg-dark-700 text-white' : 'hover:bg-gray-100 text-gray-900'
      }`}
      aria-label="Open menu"
    >
      <Bars3Icon className="w-6 h-6" />
    </button>
  )
}

function NavLink({
  item,
  isActive,
  isCollapsed,
  theme,
  onNavigate,
}: {
  item: (typeof navigation)[0]
  isActive: boolean
  isCollapsed: boolean
  theme: string
  onNavigate?: () => void
}) {
  return (
    <Link
      href={appPath(item.href)}
      onClick={onNavigate}
      className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
        isActive
          ? 'nav-active'
          : theme === 'dark'
            ? 'text-gray-300 hover:bg-dark-800 hover:text-white'
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      } ${isCollapsed ? 'justify-center' : ''}`}
      title={isCollapsed ? item.name : undefined}
    >
      <item.icon className={`w-6 h-6 sm:w-[26px] sm:h-[26px] flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
      {!isCollapsed && <span className="text-sm sm:text-base">{item.name}</span>}
    </Link>
  )
}

export default function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean
  onMobileClose?: () => void
}) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { theme } = useTheme()

  const shellClass =
    theme === 'dark'
      ? 'bg-dark-900 border-r border-dark-800'
      : 'bg-white border-r border-gray-200'

  const sidebarContent = (
    <div className="p-4 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6 lg:mb-8 gap-2">
        <div className={`min-w-0 flex-1 ${isCollapsed ? 'hidden lg:flex lg:justify-center' : 'flex'}`}>
          <BrandLogo compact={isCollapsed} size="dashboard" priority />
        </div>
        <button
          type="button"
          onClick={() => (onMobileClose ? onMobileClose() : setIsCollapsed(!isCollapsed))}
          className={`p-2 rounded-lg transition-colors shrink-0 ${
            theme === 'dark' ? 'hover:bg-dark-800' : 'hover:bg-gray-100'
          }`}
          aria-label={onMobileClose ? 'Close menu' : 'Toggle sidebar'}
        >
          {onMobileClose ? (
            <XMarkIcon className="w-5 h-5" />
          ) : (
            <svg className="w-5 h-5 hidden lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <nav className="space-y-2 shrink-0">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            isActive={pathname === item.href || pathname === appPath(item.href)}
            isCollapsed={isCollapsed && !onMobileClose}
            theme={theme}
            onNavigate={onMobileClose}
          />
        ))}
      </nav>

      <div className={`my-3 border-t shrink-0 ${theme === 'dark' ? 'border-dark-800' : 'border-gray-200'}`} />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Suspense fallback={null}>
          <SidebarCategories
            isCollapsed={isCollapsed && !onMobileClose}
            onNavigate={onMobileClose}
          />
        </Suspense>
      </div>

      <div className={`pt-4 mt-auto shrink-0 border-t ${theme === 'dark' ? 'border-dark-800' : 'border-gray-200'}`}>
        <nav className="space-y-2">
          {bottomNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={pathname === item.href || pathname === appPath(item.href)}
              isCollapsed={isCollapsed && !onMobileClose}
              theme={theme}
              onNavigate={onMobileClose}
            />
          ))}
        </nav>
      </div>

      {!isCollapsed && (
        <div
          className={`mt-4 pt-4 border-t text-xs ${
            theme === 'dark' ? 'border-dark-800 text-gray-400' : 'border-gray-200 text-gray-500'
          }`}
        >
          <p>
            <b>{APP_COPYRIGHT}</b>
          </p>
        </div>
      )}
    </div>
  )

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu overlay"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`sidebar transition-transform duration-300 z-50
          fixed inset-y-0 left-0 w-[min(100vw-3rem,16rem)] sm:w-64
          lg:static lg:translate-x-0 lg:w-64 lg:h-screen lg:overflow-hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${shellClass}`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
