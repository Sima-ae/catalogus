'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Sidebar, { SidebarMenuButton, useMobileSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import { useCatalogModeRedirect } from '@/lib/use-catalog-mode-redirect'

export default function CheckoutSuccessPage() {
  const { blocked } = useCatalogModeRedirect()
  const { clearCart } = useCart()
  const { theme } = useTheme()
  const { mobileOpen, open, close } = useMobileSidebar()

  useEffect(() => {
    clearCart()
  }, [clearCart])

  if (blocked) return null

  return (
    <div
      className={`flex min-h-screen transition-colors duration-200 ${
        theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
      } overflow-x-hidden`}
    >
      <Sidebar open={mobileOpen} onClose={close} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppStickyHeader
          title="Checkout"
          showSocialProof
          leading={<SidebarMenuButton open={mobileOpen} onOpen={open} />}
          actions={<ShopHeroHeaderActions />}
        />
        <main
          className={`flex-1 flex items-center justify-center p-4 transition-colors duration-200 ${
            theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
          }`}
        >
          <div className="text-center max-w-md">
            <div
              className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                theme === 'dark' ? 'bg-green-800' : 'bg-green-100'
              }`}
            >
              <ShieldCheckIcon className="w-12 h-12 text-green-500" />
            </div>
            <h2
              className={`text-2xl font-bold mb-2 transition-colors ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}
            >
              Payment successful
            </h2>
            <p
              className={`mb-6 transition-colors ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Thank you for your purchase. You will receive a confirmation email shortly.
            </p>
            <Link href="/" className="btn-primary inline-flex items-center space-x-2">
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
