'use client'

import { useTheme } from '@/lib/theme'
import ThemeToggleButton from '@/components/theme/ThemeToggleButton'
import ShopCartHeaderButton from '@/components/shop/ShopCartHeaderButton'
import { ShopRegisterHeaderButtons } from '@/components/shop/ShopRegisterLinks'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'

type ShopHeroHeaderActionsProps = {
  /** Override cart badge (e.g. on product page). */
  cartBadgeCount?: number
}

/** Theme, cart, and register actions for the sticky header third column — single row. */
export default function ShopHeroHeaderActions(props: ShopHeroHeaderActionsProps = {}) {
  const { cartBadgeCount } = props
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5 lg:gap-2 w-full min-w-0 overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
      <div className="order-first shrink-0 lg:order-none">
        <LanguageSwitcher compact iconOnlyOnMobile />
      </div>
      <ThemeToggleButton />
      <button
        type="button"
        className={`hidden sm:inline-flex p-2 rounded-lg transition-colors duration-200 shrink-0 ${
          isDark
            ? 'text-gray-400 hover:text-white hover:bg-dark-800'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
        }`}
        title="Grid View"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      </button>
      <ShopCartHeaderButton badgeCount={cartBadgeCount} />
      <ShopRegisterHeaderButtons
        className="flex-nowrap shrink-0 gap-1.5 lg:gap-2"
        buttonClassName="btn-primary text-xs lg:text-sm px-2.5 lg:px-3 py-2 inline-flex whitespace-nowrap shrink-0"
      />
    </div>
  )
}
