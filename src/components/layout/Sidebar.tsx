'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'

/** Sidebar open/close — closed by default on viewports below lg. */
export function useShopSidebar() {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setOpen(false)
    }
  }, [])

  const openSidebar = useCallback(() => setOpen(true), [])
  const closeSidebar = useCallback(() => setOpen(false), [])
  return { open, openSidebar, closeSidebar }
}

/** @deprecated Use useShopSidebar */
export function useMobileSidebar() {
  const [mobileOpen, setMobileOpen] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setMobileOpen(false)
    }
  }, [])

  const open = useCallback(() => setMobileOpen(true), [])
  const close = useCallback(() => setMobileOpen(false), [])
  return { mobileOpen, open, close }
}
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth-local'
import { APP_COPYRIGHT } from '@/lib/brand'
import { appPath } from '@/lib/paths'
import BrandLogo from '@/components/brand/BrandLogo'
import ShopCatalogBadge from '@/components/shop/ShopCatalogBadge'
import SidebarCategories from '@/components/layout/SidebarCategories'
import {
  HomeIcon,
  CubeIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  EnvelopeIcon,
  Cog6ToothIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'New', href: '/new', icon: CubeIcon },
]

const bottomNavigationBase = [
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon, superAdminOnly: true },
  { name: 'Become a Buyer', href: '/buyer', icon: UserGroupIcon },
  { name: 'Become a Seller', href: '/seller', icon: ShoppingBagIcon },
  { name: 'Contact', href: '/contact', icon: EnvelopeIcon },
]

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  const { theme } = useTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors shrink-0 ${
        theme === 'dark' ? 'hover:bg-dark-700 text-white' : 'hover:bg-gray-100 text-gray-900'
      }`}
      aria-label="Open menu"
    >
      <Bars3Icon className="w-6 h-6" />
    </button>
  )
}

/** Header hamburger — only visible while the shop sidebar is closed. */
export function SidebarMenuButton({
  open,
  onOpen,
}: {
  open: boolean
  onOpen: () => void
}) {
  if (open) return null
  return <MobileMenuButton onClick={onOpen} />
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
  open = true,
  onClose,
  /** @deprecated Use `open` */
  mobileOpen,
  /** @deprecated Use `onClose` */
  onMobileClose,
}: {
  open?: boolean
  onClose?: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}) {
  const pathname = usePathname()
  const isOpen = open ?? mobileOpen ?? true
  const close = onClose ?? onMobileClose
  const { theme } = useTheme()
  const { isSuperAdmin, loading: authLoading } = useAuth()

  const bottomNavigation = bottomNavigationBase.filter(
    (item) => !item.superAdminOnly || (!authLoading && isSuperAdmin)
  )

  const shellClass =
    theme === 'dark'
      ? 'bg-dark-900 border-r border-dark-800'
      : 'bg-white border-r border-gray-200'

  const sidebarContent = (
    <div className="p-4 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="mb-4 shrink-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 flex">
            <BrandLogo size="dashboard" priority />
          </div>
          <button
            type="button"
            onClick={() => close?.()}
            className={`p-2 rounded-lg transition-colors shrink-0 ${
              theme === 'dark' ? 'hover:bg-dark-800' : 'hover:bg-gray-100'
            }`}
            aria-label="Close menu"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div>
          <ShopCatalogBadge label="Catalog 2026" />
        </div>
      </div>

      <nav className="space-y-2 shrink-0">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            item={item}
            isActive={pathname === item.href || pathname === appPath(item.href)}
            isCollapsed={false}
            theme={theme}
            onNavigate={close}
          />
        ))}
      </nav>

      <div className={`my-3 border-t shrink-0 ${theme === 'dark' ? 'border-dark-800' : 'border-gray-200'}`} />

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <Suspense fallback={null}>
          <SidebarCategories isCollapsed={false} onNavigate={close} />
        </Suspense>
      </div>

      <div className={`pt-4 mt-auto shrink-0 border-t ${theme === 'dark' ? 'border-dark-800' : 'border-gray-200'}`}>
        <nav className="space-y-2">
          {bottomNavigation.map((item) => (
            <NavLink
              key={item.name}
              item={item}
              isActive={pathname === item.href || pathname === appPath(item.href)}
              isCollapsed={false}
              theme={theme}
              onNavigate={close}
            />
          ))}
        </nav>
      </div>

      <div
        className={`mt-4 pt-4 border-t text-xs ${
          theme === 'dark' ? 'border-dark-800 text-gray-400' : 'border-gray-200 text-gray-500'
        }`}
      >
        <p>
          <b>{APP_COPYRIGHT}</b>
        </p>
      </div>
    </div>
  )

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu overlay"
          onClick={close}
        />
      )}

      <aside
        className={`sidebar z-50 h-screen overflow-hidden border-r
          w-[min(100vw-3rem,16rem)] sm:w-64
          fixed inset-y-0 left-0 transition-transform duration-300
          lg:transition-none
          ${
            isOpen
              ? 'translate-x-0 lg:static lg:translate-x-0 lg:shrink-0'
              : '-translate-x-full lg:hidden'
          }
          ${shellClass}`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
