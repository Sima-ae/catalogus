'use client'

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import Link from 'next/link'
import ShopPageShell from '@/components/shop/ShopPageShell'
import { useTheme } from '@/lib/theme'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { appPath } from '@/lib/paths'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { APP_NAME, APP_COPYRIGHT, CART_STORAGE_KEY } from '@/lib/brand'
import { DEFAULT_SITE_SETTINGS, type SiteSettings } from '@/lib/site-settings'
import { parseSettingsResponse } from '@/lib/parse-settings-response'
import {
  SunIcon,
  MoonIcon,
  CurrencyEuroIcon,
  UserCircleIcon,
  ShoppingCartIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'

export default function ShopSettingsPage() {
  const { user } = useAuth()
  const { catalogMode } = useCatalogMode()
  const { theme, setTheme, toggleTheme } = useTheme()
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS)
  const [loading, setLoading] = useState(true)
  const authHeaders = useMemo(() => catalogAuthHeaders(user), [user])

  useEffect(() => {
    fetch(appPath('/api/settings'), { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === 'object' && !data.error) {
          setSettings(parseSettingsResponse(data).settings)
        }
      })
      .finally(() => setLoading(false))
  }, [authHeaders])

  const isDark = theme === 'dark'
  const card = isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'
  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const heading = isDark ? 'text-white' : 'text-gray-900'

  const clearCart = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CART_STORAGE_KEY)
      window.location.reload()
    }
  }

  const taxPercent = (() => {
    const n = parseFloat(settings.tax_rate)
    return Number.isFinite(n) ? `${n}%` : '—'
  })()

  return (
    <ShopPageShell title="Settings">
      <section
        className={`rounded-2xl border p-6 sm:p-8 mb-8 ${
          isDark
            ? 'bg-gradient-to-br from-dark-800 via-dark-900 to-black border-dark-700'
            : 'bg-gradient-to-br from-gray-100 via-white to-gray-50 border-gray-200'
        }`}
      >
        <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${heading}`}>Your preferences</h2>
        <p className={`max-w-2xl ${muted}`}>
          Customize how {settings.site_name || APP_NAME} looks on your device. Store currency and tax are set by the
          marketplace administrator.
        </p>
      </section>

      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <SettingBlock title="Appearance" description="Choose light or dark mode for the shop" isDark={isDark}>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                theme === 'light'
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : isDark
                    ? 'border-dark-600 hover:bg-dark-700 text-gray-300'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <SunIcon className="w-5 h-5" />
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                theme === 'dark'
                  ? 'border-primary-500 bg-primary-500 text-white'
                  : isDark
                    ? 'border-dark-600 hover:bg-dark-700 text-gray-300'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <MoonIcon className="w-5 h-5" />
              Dark
            </button>
          </div>
          <button type="button" onClick={toggleTheme} className={`mt-3 text-sm underline ${muted}`}>
            Quick toggle theme
          </button>
        </SettingBlock>

        <SettingBlock
          title="Store"
          description={loading ? 'Loading store settings…' : settings.site_tagline}
          isDark={isDark}
        >
          <dl className="space-y-3 text-sm">
            <Row label="Site name" value={settings.site_name || APP_NAME} isDark={isDark} />
            <Row
              label="Currency"
              value={settings.currency || 'USD'}
              icon={CurrencyEuroIcon}
              isDark={isDark}
            />
            <Row label="Tax rate" value={taxPercent} isDark={isDark} />
            {settings.support_email ? (
              <Row label="Support" value={settings.support_email} isDark={isDark} />
            ) : null}
          </dl>
        </SettingBlock>

        <SettingBlock title="Account & orders" description="Manage purchases and selling" isDark={isDark}>
          <nav className="space-y-2">
            <SettingsLink href={appPath('/buyer')} icon={UserCircleIcon} label="Buyer dashboard" isDark={isDark} />
            <SettingsLink href={appPath('/seller')} icon={UserCircleIcon} label="Seller portal" isDark={isDark} />
            <SettingsLink href={appPath('/login')} icon={ArrowRightOnRectangleIcon} label="Sign in" isDark={isDark} />
          </nav>
        </SettingBlock>

        {!catalogMode && (
          <SettingBlock title="Cart" description="Local cart stored on this browser" isDark={isDark}>
            <SettingsLink href={appPath('/cart')} icon={ShoppingCartIcon} label="Open cart" isDark={isDark} />
            <button
              type="button"
              onClick={clearCart}
              className={`mt-4 text-sm text-red-600 dark:text-red-400 hover:underline`}
            >
              Clear saved cart on this device
            </button>
          </SettingBlock>
        )}
      </div>

      <p className={`mt-10 text-center text-xs ${muted}`}>
        Admin store configuration:{' '}
        <Link href={appPath('/admin/settings')} className="underline hover:text-primary-500">
          Admin settings
        </Link>
        {' · '}
        {APP_COPYRIGHT}
      </p>
    </ShopPageShell>
  )
}

function SettingBlock({
  title,
  description,
  children,
  isDark,
}: {
  title: string
  description: string
  children: ReactNode
  isDark: boolean
}) {
  return (
    <section className={`rounded-xl border p-6 ${isDark ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'}`}>
      <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
      <p className={`text-sm mt-1 mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{description}</p>
      {children}
    </section>
  )
}

function Row({
  label,
  value,
  icon: Icon,
  isDark,
}: {
  label: string
  value: string
  icon?: ComponentType<{ className?: string }>
  isDark: boolean
}) {
  return (
    <div className="flex justify-between items-center gap-4">
      <dt className={isDark ? 'text-gray-400' : 'text-gray-600'}>{label}</dt>
      <dd className={`font-medium flex items-center gap-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {Icon && <Icon className="w-4 h-4 opacity-70" />}
        {value}
      </dd>
    </div>
  )
}

function SettingsLink({
  href,
  icon: Icon,
  label,
  isDark,
}: {
  href: string
  icon: ComponentType<{ className?: string }>
  label: string
  isDark: boolean
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors ${
        isDark
          ? 'border-dark-600 hover:bg-dark-700 text-gray-200'
          : 'border-gray-200 hover:bg-gray-50 text-gray-800'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="w-5 h-5 opacity-80" />
        {label}
      </span>
      <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>→</span>
    </Link>
  )
}
