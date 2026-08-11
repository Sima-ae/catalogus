'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Sidebar, { SidebarMenuButton, useMobileSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { useCatalogModeRedirect } from '@/lib/use-catalog-mode-redirect'
import { appPath } from '@/lib/paths'

export default function CheckoutSuccessPage() {
  const { blocked } = useCatalogModeRedirect()
  const { clearCart } = useCart()
  const { theme } = useTheme()
  const { locale } = useI18n()
  const { mobileOpen, open, close } = useMobileSidebar()
  const isDark = theme === 'dark'
  const nl = locale === 'nl'

  useEffect(() => {
    clearCart()
  }, [clearCart])

  if (blocked) return null

  const pageBg = isDark ? 'bg-dark-900' : 'bg-gray-50'
  const text = isDark ? 'text-white' : 'text-gray-900'
  const muted = isDark ? 'text-gray-400' : 'text-gray-500'

  return (
    <div className={`flex min-h-screen overflow-x-hidden transition-colors duration-200 ${pageBg}`}>
      <Sidebar open={mobileOpen} onClose={close} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppStickyHeader
          title={nl ? 'Afrekenen' : 'Checkout'}
          showSocialProof
          leading={<SidebarMenuButton open={mobileOpen} onOpen={open} />}
          actions={<ShopHeroHeaderActions />}
        />
        <main className={`flex flex-1 items-center justify-center p-4 ${pageBg}`}>
          <div
            className={`w-full max-w-md rounded-2xl border p-10 text-center ${
              isDark
                ? 'border-dark-700/70 bg-dark-800/60'
                : 'border-gray-200/80 bg-white/80'
            }`}
          >
            <div
              className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
                isDark ? 'bg-green-900/40' : 'bg-green-100'
              }`}
            >
              <ShieldCheckIcon className="h-8 w-8 text-green-500" />
            </div>
            <h1 className={`text-2xl font-semibold tracking-tight ${text}`}>
              {nl ? 'Betaling gelukt' : 'Payment successful'}
            </h1>
            <p className={`mt-3 ${muted}`}>
              {nl
                ? 'Bedankt voor uw aankoop. U ontvangt binnenkort een bevestiging per e-mail.'
                : 'Thank you for your purchase. You will receive a confirmation email shortly.'}
            </p>
            <Link
              href={appPath('/')}
              className="btn-primary mt-8 inline-flex rounded-2xl px-5 py-2.5 text-sm font-medium"
            >
              {nl ? 'Verder winkelen' : 'Continue shopping'}
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
