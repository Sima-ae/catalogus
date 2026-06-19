'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme'
import { appPath, isAppPath } from '@/lib/paths'
import { APP_COPYRIGHT } from '@/lib/brand'
import BrandLogo from '@/components/brand/BrandLogo'
import SidebarWelcomeTitle from '@/components/layout/SidebarWelcomeTitle'
import ShopCatalogBadge from '@/components/shop/ShopCatalogBadge'
import { useI18n } from '@/lib/i18n-context'
import { useAuth } from '@/lib/auth-local'
import { useAdminPricelistTargetSlug } from '@/components/admin/PricelistTargetSelector'
import {
  HomeIcon,
  CubeIcon,
  ShoppingCartIcon,
  UsersIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  TagIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  Bars3Icon,
  XMarkIcon,
  TrashIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { nameKey: 'admin.nav.dashboard', href: '/admin', icon: HomeIcon },
  { nameKey: 'admin.nav.products', href: '/admin/products', icon: CubeIcon },
  { nameKey: 'admin.nav.categories', href: '/admin/categories', icon: TagIcon },
  { nameKey: 'admin.nav.brands', href: '/admin/brands', icon: BuildingStorefrontIcon },
  { nameKey: 'admin.nav.pricelist', href: '/pricelist', icon: DocumentTextIcon, newTab: true, dynamicOwner: true },
  { nameKey: 'admin.nav.pricelistPages', href: '/admin/pricelist-pages', icon: DocumentTextIcon, superAdminOnly: true },
  { nameKey: 'admin.nav.trash', href: '/admin/trash', icon: TrashIcon },
  { nameKey: 'admin.nav.catalogCleanup', href: '/admin/catalog-cleanup', icon: ArchiveBoxIcon },
  { nameKey: 'admin.nav.orders', href: '/admin/orders', icon: ShoppingCartIcon },
  { nameKey: 'admin.nav.users', href: '/admin/users', icon: UsersIcon },
  { nameKey: 'admin.nav.import', href: '/admin/import', icon: ArrowDownTrayIcon },
  { nameKey: 'admin.nav.reviews', href: '/admin/reviews', icon: DocumentTextIcon },
  { nameKey: 'admin.nav.analytics', href: '/admin/analytics', icon: ChartBarIcon },
  { nameKey: 'admin.nav.settings', href: '/admin/settings', icon: Cog6ToothIcon, superAdminOnly: true },
] as const

/** Admin sidebar open/close — closed by default below lg, toggleable on all viewports. */
export function useAdminSidebar() {
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

export function AdminMobileMenuButton({ onClick }: { onClick: () => void }) {
  const { theme } = useTheme()
  const { t: tr } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors shrink-0 ${
        theme === 'dark' ? 'hover:bg-dark-700 text-white' : 'hover:bg-gray-100 text-gray-900'
      }`}
      aria-label={tr('admin.openMenu')}
    >
      <Bars3Icon className="w-6 h-6" />
    </button>
  )
}

/** Header hamburger — only visible while the admin sidebar is closed. */
export function AdminSidebarMenuButton({
  open,
  onOpen,
}: {
  open: boolean
  onOpen: () => void
}) {
  if (open) return null
  return <AdminMobileMenuButton onClick={onOpen} />
}

export default function AdminSidebar({
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
  const { theme } = useTheme()
  const { t: tr } = useI18n()
  const { isSuperAdmin } = useAuth()
  const pricelistTarget = useAdminPricelistTargetSlug()
  const isDark = theme === 'dark'
  const isOpen = open ?? mobileOpen ?? true
  const close = onClose ?? onMobileClose

  const shellClass = isDark
    ? 'bg-dark-900 border-dark-800'
    : 'bg-white border-gray-200'
  const mutedText = isDark ? 'text-gray-400' : 'text-gray-600'
  const navIdle = isDark
    ? 'text-gray-300 hover:bg-dark-800 hover:text-white'
    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
  const borderClass = isDark ? 'border-dark-800' : 'border-gray-200'

  const sidebar = (
    <div className="p-4 sm:p-6 h-full flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between mb-6 gap-2">
        <BrandLogo size="dashboard" dashboardSidebar={isDark} priority />
        <button
          type="button"
          onClick={() => close?.()}
          className={`p-2 rounded-lg transition-colors shrink-0 ${
            isDark ? 'hover:bg-dark-700' : 'hover:bg-gray-100'
          }`}
          aria-label={tr('admin.closeMenu')}
        >
          <XMarkIcon className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
        </button>
      </div>

      <div className="mb-4 space-y-2">
        <ShopCatalogBadge label={tr('badge.catalog2026')} />
        <SidebarWelcomeTitle />
      </div>

      <nav className="space-y-2 flex-1">
        {navigation.map((item) => {
          if ('superAdminOnly' in item && item.superAdminOnly && !isSuperAdmin) return null
          const href =
            'dynamicOwner' in item && item.dynamicOwner
              ? `${item.href}?owner=${encodeURIComponent(pricelistTarget)}`
              : item.href
          const isActive = isAppPath(pathname, item.href)
          return (
            <Link
              key={item.nameKey}
              href={appPath(href)}
              onClick={close}
              {...('newTab' in item && item.newTab
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
              className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm sm:text-base ${
                isActive ? 'nav-active' : navIdle
              }`}
            >
              <item.icon className="w-5 h-5 mr-3 shrink-0" />
              <span>{tr(item.nameKey)}</span>
            </Link>
          )
        })}
      </nav>

      <div className={`mt-6 pt-6 border-t ${borderClass}`}>
        <h3 className={`text-sm font-medium mb-3 ${mutedText}`}>{tr('admin.quickActions')}</h3>
        <div className="space-y-2">
          <Link
            href={appPath('/admin/products/new')}
            onClick={close}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${navIdle}`}
          >
            <CubeIcon className="w-4 h-4 mr-3" />
            {tr('admin.addProduct')}
          </Link>
          <Link
            href={appPath('/admin/categories/new')}
            onClick={close}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${navIdle}`}
          >
            <TagIcon className="w-4 h-4 mr-3" />
            {tr('admin.addCategory')}
          </Link>
        </div>
      </div>

      <div className={`mt-6 pt-6 border-t text-xs ${borderClass} ${mutedText}`}>
        <div className="space-y-2">
          <Link
            href={appPath('/')}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            className={`block transition-colors ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}
          >
            {tr('admin.visitSite')}
          </Link>
          <Link
            href={appPath('/admin/settings')}
            onClick={close}
            className={`block transition-colors ${isDark ? 'hover:text-white' : 'hover:text-gray-900'}`}
          >
            {tr('admin.nav.settings')}
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
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label={tr('admin.closeOverlay')}
          onClick={close}
        />
      )}
      <aside
        className={`sidebar z-50 h-screen overflow-hidden border-r ${shellClass}
          w-[min(100vw-3rem,16rem)] sm:w-64
          fixed inset-y-0 left-0 transition-transform duration-300
          lg:transition-none
          ${
            isOpen
              ? 'translate-x-0 lg:static lg:translate-x-0 lg:shrink-0'
              : '-translate-x-full lg:hidden'
          }`}
      >
        {sidebar}
      </aside>
    </>
  )
}
