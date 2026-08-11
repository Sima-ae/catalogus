'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Sidebar, { SidebarMenuButton, useMobileSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { ArrowLeftIcon, CreditCardIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth-local'
import { appPath } from '@/lib/paths'
import { formatPrice } from '@/lib/format-price'
import { productIsPurchasable } from '@/lib/shop-commerce'
import { useCatalogModeRedirect } from '@/lib/use-catalog-mode-redirect'

function CheckoutPageInner() {
  const { blocked } = useCatalogModeRedirect()
  const { state: cartState } = useCart()
  const { theme } = useTheme()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const { mobileOpen, open, close } = useMobileSidebar()
  const canceled = searchParams.get('canceled') === '1'

  const purchasableItems = useMemo(
    () => cartState.items.filter((item) => productIsPurchasable(item.price)),
    [cartState.items]
  )
  const cartTotal = useMemo(
    () => purchasableItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [purchasableItems]
  )

  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: user?.email || '',
    phone: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.email) {
      setCustomerInfo((prev) => ({ ...prev, email: user.email || prev.email }))
    }
  }, [user?.email])

  if (blocked) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCustomerInfo((prev) => ({ ...prev, [name]: value }))
  }

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purchasableItems.length || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch(appPath('/api/shop/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: customerInfo.name.trim(),
            email: customerInfo.email.trim(),
            phone: customerInfo.phone.trim() || undefined,
          },
          items: purchasableItems.map((item) => ({
            productId: item.productId || item.id.split('::')[0],
            quantity: item.quantity,
          })),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Failed to start checkout')
      }
      window.location.href = String(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
      setIsSubmitting(false)
    }
  }

  if (purchasableItems.length === 0) {
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
            className={`flex-1 flex items-center justify-center transition-colors duration-200 ${
              theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
            }`}
          >
            <div className="text-center px-4">
              <h2
                className={`text-2xl font-bold mb-2 transition-colors ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}
              >
                Your cart is empty
              </h2>
              <p
                className={`mb-6 transition-colors ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Add priced products to your cart before checking out.
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
          leading={
            <>
              <SidebarMenuButton open={mobileOpen} onOpen={open} />
              <Link
                href="/cart"
                className={`transition-colors shrink-0 ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>
            </>
          }
          actions={<ShopHeroHeaderActions />}
        />

        <main
          className={`flex-1 p-4 sm:p-6 overflow-x-hidden transition-colors duration-200 ${
            theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            {canceled ? (
              <div
                className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                  theme === 'dark'
                    ? 'border-amber-700/50 bg-amber-950/40 text-amber-200'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                Payment was canceled. You can try again when ready.
              </div>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <form onSubmit={handlePay} className="space-y-6">
                <div
                  className={`rounded-lg p-6 border transition-colors ${
                    theme === 'dark'
                      ? 'bg-dark-800 border-dark-700'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <h2
                    className={`text-xl font-semibold mb-4 transition-colors ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Contact details
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Full name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={customerInfo.name}
                        onChange={handleInputChange}
                        required
                        minLength={2}
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={customerInfo.email}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        Phone (optional)
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={customerInfo.phone}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-dark-700 border-dark-600 text-white focus:border-primary-500'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-primary-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className={`rounded-lg p-6 border transition-colors ${
                    theme === 'dark'
                      ? 'bg-dark-800 border-dark-700'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <ShieldCheckIcon className="w-6 h-6 text-primary-500 shrink-0" />
                    <p
                      className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      }`}
                    >
                      You will complete payment securely on Stripe. Shipping address is collected
                      there.
                    </p>
                  </div>
                  {error ? <p className="text-red-500 text-sm mb-3">{error}</p> : null}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full btn-primary py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    <CreditCardIcon className="w-5 h-5" />
                    {isSubmitting ? 'Redirecting…' : `Pay ${formatPrice(cartTotal)} with Stripe`}
                  </button>
                </div>
              </form>

              <div>
                <div
                  className={`rounded-lg p-6 border sticky top-28 lg:top-32 transition-colors ${
                    theme === 'dark'
                      ? 'bg-dark-800 border-dark-700'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <h2
                    className={`text-xl font-bold mb-4 transition-colors ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    Order summary
                  </h2>
                  <ul className="space-y-4 mb-6">
                    {purchasableItems.map((item) => (
                      <li key={item.id} className="flex gap-3">
                        <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100 shrink-0">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              fill
                              className="object-contain"
                              sizes="64px"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium line-clamp-2 ${
                              theme === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {item.name}
                          </p>
                          <p
                            className={`text-xs ${
                              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}
                          >
                            Qty {item.quantity} · {formatPrice(item.price)}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-medium shrink-0 ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div
                    className={`border-t pt-3 flex justify-between text-lg font-bold ${
                      theme === 'dark'
                        ? 'border-dark-600 text-white'
                        : 'border-gray-300 text-gray-900'
                    }`}
                  >
                    <span>Total</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutPageInner />
    </Suspense>
  )
}
