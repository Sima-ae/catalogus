'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Sidebar, { SidebarMenuButton, useMobileSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { QuantityStepper } from '@/components/shop/QuantityStepper'
import { useCart } from '@/lib/cart'
import { useTheme } from '@/lib/theme'
import { useAuth } from '@/lib/auth-local'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import { productIsPurchasable } from '@/lib/shop-commerce'
import { formatShopEuro, splitInclusiveVat } from '@/lib/shop-vat'
import { shouldUnoptimizeProductImage } from '@/lib/product-image-url'
import { useCatalogModeRedirect } from '@/lib/use-catalog-mode-redirect'

function CheckoutPageInner() {
  const { blocked } = useCatalogModeRedirect()
  const { state: cartState, removeItem, updateQuantity } = useCart()
  const { theme } = useTheme()
  const { user } = useAuth()
  const { locale } = useI18n()
  const searchParams = useSearchParams()
  const { mobileOpen, open, close } = useMobileSidebar()
  const isDark = theme === 'dark'
  const nl = locale === 'nl'
  const canceled = searchParams.get('canceled') === '1'

  const items = useMemo(
    () => cartState.items.filter((item) => productIsPurchasable(item.price)),
    [cartState.items]
  )
  const totalIncl = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )
  const euros = splitInclusiveVat(totalIncl)

  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stripeReady, setStripeReady] = useState<boolean | null>(null)

  useEffect(() => {
    if (user?.email) setEmail(user.email)
  }, [user?.email])

  useEffect(() => {
    let cancelled = false
    fetch(appPath('/api/shop/status'))
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setStripeReady(Boolean(data?.ready))
      })
      .catch(() => {
        if (!cancelled) setStripeReady(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (blocked) return null

  const pageBg = isDark ? 'bg-dark-900' : 'bg-gray-50'
  const card =
    isDark
      ? 'rounded-2xl border border-dark-700/70 bg-dark-800/60'
      : 'rounded-2xl border border-gray-200/80 bg-white/80'
  const aside =
    isDark
      ? 'h-fit space-y-4 rounded-2xl border border-dark-700/70 bg-dark-800/40 p-6'
      : 'h-fit space-y-4 rounded-2xl border border-gray-200/80 bg-gray-100/50 p-6'
  const muted = isDark ? 'text-gray-400' : 'text-gray-500'
  const text = isDark ? 'text-white' : 'text-gray-900'
  const inputClass = `h-11 w-full rounded-xl border px-3 outline-none transition focus:border-primary-500 ${
    isDark
      ? 'border-dark-600 bg-dark-900 text-white'
      : 'border-gray-200 bg-white text-gray-900'
  }`

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!items.length || isSubmitting || stripeReady === false) return
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch(appPath('/api/shop/checkout'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
            company: company.trim() || undefined,
          },
          items: items.map((item) => ({
            productId: item.productId || item.id.split('::')[0],
            quantity: item.quantity,
          })),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || (nl ? 'Afrekenen mislukt' : 'Failed to start checkout'))
      }
      window.location.href = String(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : nl ? 'Afrekenen mislukt' : 'Failed to start checkout')
      setIsSubmitting(false)
    }
  }

  const emptyState = (
    <div className={`${aside} p-10 text-center`}>
      <p className={muted}>{nl ? 'Uw winkelwagen is leeg.' : 'Your cart is empty.'}</p>
      <Link
        href={appPath('/')}
        className="btn-primary mt-6 inline-flex rounded-2xl px-5 py-2.5 text-sm font-medium"
      >
        {nl ? 'Verder winkelen' : 'Continue shopping'}
      </Link>
    </div>
  )

  const summaryLines = (
    <ul className="space-y-4">
      {items.map((item) => (
        <li
          key={item.id}
          className={`flex gap-3 border-b pb-4 last:border-0 ${
            isDark ? 'border-dark-600/60' : 'border-gray-200/70'
          }`}
        >
          <div
            className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ${
              isDark ? 'bg-dark-700' : 'bg-gray-200'
            }`}
          >
            {item.image_url ? (
              <Image
                src={item.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
                unoptimized={shouldUnoptimizeProductImage(item.image_url)}
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <p className={`text-sm font-medium leading-snug ${text}`}>{item.name}</p>
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className={`shrink-0 text-xs underline-offset-2 hover:underline ${muted}`}
              >
                {nl ? 'Verwijderen' : 'Remove'}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <QuantityStepper
                size="sm"
                value={item.quantity}
                onChange={(next) => updateQuantity(item.id, next)}
              />
              <span className={`text-sm font-semibold ${text}`}>
                {formatShopEuro(item.price * item.quantity, locale)}
              </span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )

  const totalsDl = (
    <dl
      className={`space-y-2 border-t pt-4 text-sm ${
        isDark ? 'border-dark-600' : 'border-gray-200'
      }`}
    >
      <div className="flex justify-between gap-4">
        <dt className={muted}>{nl ? 'Subtotaal excl. BTW' : 'Subtotal excl. VAT'}</dt>
        <dd className={text}>{formatShopEuro(euros.excl, locale)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className={muted}>{nl ? 'BTW 21%' : 'VAT 21%'}</dt>
        <dd className={text}>{formatShopEuro(euros.vat, locale)}</dd>
      </div>
      <div className="flex justify-between gap-4 text-base font-semibold">
        <dt className={text}>{nl ? 'Totaal incl. BTW' : 'Total incl. VAT'}</dt>
        <dd className={text}>{formatShopEuro(euros.incl, locale)}</dd>
      </div>
    </dl>
  )

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

        <main className={`flex-1 transition-colors duration-200 ${pageBg}`}>
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
            <h1 className={`text-3xl font-semibold tracking-tight md:text-4xl ${text}`}>
              {nl ? 'Afrekenen' : 'Checkout'}
            </h1>
            <p className={`mt-2 max-w-2xl ${muted}`}>
              {nl
                ? 'Een account aanmaken is niet verplicht. Vul uw gegevens in en betaal veilig online via Stripe.'
                : 'Creating an account is not required. Enter your details and pay securely online via Stripe.'}
            </p>

            {canceled ? (
              <div
                className={`mt-6 rounded-xl border px-4 py-3 text-sm ${
                  isDark
                    ? 'border-amber-700/50 bg-amber-950/40 text-amber-200'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
                }`}
              >
                {nl
                  ? 'Betaling geannuleerd. U kunt het opnieuw proberen wanneer u klaar bent.'
                  : 'Payment was canceled. You can try again when ready.'}
              </div>
            ) : null}

            <div className="mt-8">
              {items.length === 0 ? (
                emptyState
              ) : (
                <form
                  onSubmit={handlePay}
                  className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]"
                >
                  <div className="space-y-6">
                    <div className={`space-y-4 p-6 ${card}`}>
                      <h2 className={`text-xl font-semibold ${text}`}>
                        {nl ? 'Uw gegevens' : 'Your details'}
                      </h2>
                      <p className={`text-sm ${muted}`}>
                        {nl
                          ? 'Wij gebruiken alle gegevens uitsluitend voor bevestiging en de factuur.'
                          : 'We use your details only for confirmation and the invoice.'}
                      </p>
                      <label className="block space-y-1.5 text-sm">
                        <span className={text}>{nl ? 'Naam' : 'Name'}</span>
                        <input
                          required
                          minLength={2}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={inputClass}
                          autoComplete="name"
                        />
                      </label>
                      <label className="block space-y-1.5 text-sm">
                        <span className={text}>E-mail</span>
                        <input
                          required
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={inputClass}
                          autoComplete="email"
                        />
                      </label>
                      <label className="block space-y-1.5 text-sm">
                        <span className={text}>
                          {nl ? 'Bedrijf (optioneel)' : 'Company (optional)'}
                        </span>
                        <input
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          className={inputClass}
                          autoComplete="organization"
                        />
                      </label>
                      <label className="block space-y-1.5 text-sm">
                        <span className={text}>
                          {nl ? 'Telefoon (optioneel)' : 'Phone (optional)'}
                        </span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={inputClass}
                          autoComplete="tel"
                        />
                      </label>
                      {error ? <p className="text-sm text-red-500">{error}</p> : null}
                      {stripeReady === false ? (
                        <p
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            isDark
                              ? 'border-amber-700/40 bg-amber-950/30 text-amber-200'
                              : 'border-amber-200 bg-amber-50 text-amber-800'
                          }`}
                        >
                          {nl
                            ? 'Betalen is tijdelijk niet beschikbaar.'
                            : 'Payments are temporarily unavailable.'}
                        </p>
                      ) : null}
                    </div>

                    <div className={`space-y-3 p-6 lg:hidden ${card}`}>
                      <h2 className={`text-lg font-semibold ${text}`}>
                        {nl ? 'Overzicht' : 'Order summary'}
                      </h2>
                      {summaryLines}
                    </div>
                  </div>

                  <aside className={aside}>
                    <h2 className={`text-xl font-semibold ${text}`}>
                      {nl ? 'Overzicht' : 'Order summary'}
                    </h2>
                    <div className="hidden lg:block">{summaryLines}</div>
                    {totalsDl}
                    <button
                      type="submit"
                      disabled={isSubmitting || stripeReady === false}
                      className="btn-primary mt-2 flex w-full items-center justify-center rounded-2xl py-3 text-base font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting
                        ? nl
                          ? 'Doorsturen…'
                          : 'Redirecting…'
                        : nl
                          ? 'Betalen'
                          : 'Pay'}
                    </button>
                    <Link
                      href={appPath('/cart')}
                      className={`flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-medium transition ${
                        isDark
                          ? 'text-gray-300 hover:bg-dark-700 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      }`}
                    >
                      {nl ? 'Terug naar winkelwagen' : 'Back to shopping cart'}
                    </Link>
                  </aside>
                </form>
              )}
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
