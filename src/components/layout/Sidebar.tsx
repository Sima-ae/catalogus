'use client'

import {
  Suspense,
  useState,
  useCallback,
  useEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from 'react'

const LG_MEDIA = '(min-width: 1024px)'
const SCROLL_COLLAPSE_OFFSET = 12

function isLargeViewport(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(LG_MEDIA).matches
}

/** Sidebar open/close — closed by default on viewports below lg. */
export function useShopSidebar() {
  const [open, setOpen] = useState(true)
  const asideRef = useRef<HTMLElement | null>(null)
  const manuallyClosedRef = useRef(false)
  const collapseScrollYRef = useRef<number | null>(null)

  const measureCollapseScrollY = useCallback(() => {
    const aside = asideRef.current
    if (!aside || !isLargeViewport()) return
    const rect = aside.getBoundingClientRect()
    collapseScrollYRef.current = window.scrollY + rect.bottom
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(measureCollapseScrollY)
    return () => cancelAnimationFrame(id)
  }, [open, measureCollapseScrollY])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onResize = () => {
      if (open && isLargeViewport()) measureCollapseScrollY()
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, measureCollapseScrollY])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onScroll = () => {
      if (!isLargeViewport()) return

      const aside = asideRef.current

      if (open && aside) {
        const rect = aside.getBoundingClientRect()
        collapseScrollYRef.current = window.scrollY + rect.bottom
        if (rect.bottom <= SCROLL_COLLAPSE_OFFSET) {
          setOpen(false)
          return
        }
        return
      }

      const threshold = collapseScrollYRef.current
      if (threshold == null) return

      const scrollY = window.scrollY

      if (scrollY > threshold - SCROLL_COLLAPSE_OFFSET) {
        setOpen(false)
        return
      }

      if (!manuallyClosedRef.current && scrollY <= threshold - SCROLL_COLLAPSE_OFFSET) {
        setOpen(true)
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [open, measureCollapseScrollY])

  const openSidebar = useCallback(() => {
    manuallyClosedRef.current = false
    setOpen(true)
  }, [])

  const closeSidebar = useCallback(() => setOpen(false), [])

  /** User tapped X — do not auto-reopen on scroll until menu is opened again. */
  const dismissSidebarManually = useCallback(() => {
    manuallyClosedRef.current = true
    setOpen(false)
  }, [])

  return {
    open,
    openSidebar,
    closeSidebar,
    dismissSidebarManually,
    asideRef,
  }
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
import { useI18n } from '@/lib/i18n-context'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'
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
  { key: 'nav.home', href: '/', icon: HomeIcon },
  { key: 'nav.new', href: '/new', icon: CubeIcon },
] as const

type BottomNavItem = {
  key: string
  href: string
  icon: any
  superAdminOnly?: boolean
}

const bottomNavigationBase: BottomNavItem[] = [
  { key: 'nav.settings', href: '/settings', icon: Cog6ToothIcon, superAdminOnly: true },
  { key: 'nav.becomeBuyer', href: '/buyer', icon: UserGroupIcon },
  { key: 'nav.becomeSeller', href: '/seller', icon: ShoppingBagIcon },
  { key: 'nav.contact', href: '/contact', icon: EnvelopeIcon },
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
  label,
  onNavigate,
}: {
  item: { href: string; icon: any }
  isActive: boolean
  isCollapsed: boolean
  theme: string
  label: string
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
      title={isCollapsed ? label : undefined}
    >
      <item.icon className={`w-6 h-6 sm:w-[26px] sm:h-[26px] flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
      {!isCollapsed && <span className="text-sm sm:text-base">{label}</span>}
    </Link>
  )
}

export default function Sidebar({
  open = true,
  onClose,
  onManualClose,
  asideRef,
  /** @deprecated Use `open` */
  mobileOpen,
  /** @deprecated Use `onClose` */
  onMobileClose,
}: {
  open?: boolean
  onClose?: () => void
  /** X button — marks sidebar as manually dismissed (no scroll reopen). */
  onManualClose?: () => void
  asideRef?: RefObject<HTMLElement | null>
  mobileOpen?: boolean
  onMobileClose?: () => void
}) {
  const pathname = usePathname()
  const isOpen = open ?? mobileOpen ?? true
  const close = onClose ?? onMobileClose
  const dismiss = onManualClose ?? close
  const setAsideNode = useCallback(
    (node: HTMLElement | null) => {
      if (asideRef) {
        ;(asideRef as MutableRefObject<HTMLElement | null>).current = node
      }
    },
    [asideRef]
  )
  const { theme } = useTheme()
  const { isSuperAdmin, loading: authLoading } = useAuth()
  const { t } = useI18n()

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
            onClick={() => dismiss?.()}
            className={`p-2 rounded-lg transition-colors shrink-0 ${
              theme === 'dark' ? 'hover:bg-dark-800' : 'hover:bg-gray-100'
            }`}
            aria-label="Close menu"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div>
          <ShopCatalogBadge label={t('badge.catalog2026')} />
        </div>
      </div>

      <nav className="space-y-2 shrink-0">
        {navigation.map((item) => (
          <NavLink
            key={item.key}
            item={item}
            label={t(item.key)}
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
        <div className="mb-3 lg:hidden">
          <LanguageSwitcher variant="sidebar" />
        </div>
        <nav className="space-y-2">
          {bottomNavigation.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              label={t(item.key)}
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
        ref={setAsideNode}
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
