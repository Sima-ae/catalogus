'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo } from 'react'
import Sidebar, { SidebarMenuButton, useMobileSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'
import { QuantityStepper } from '@/components/shop/QuantityStepper'
import { useCart } from '@/lib/cart'
import { useCatalogModeRedirect } from '@/lib/use-catalog-mode-redirect'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import { productIsPurchasable } from '@/lib/shop-commerce'
import { formatShopEuro, splitInclusiveVat } from '@/lib/shop-vat'
import { shouldUnoptimizeProductImage } from '@/lib/product-image-url'

export default function CartPage() {
  const { blocked } = useCatalogModeRedirect()
  const { state: cartState, removeItem, updateQuantity } = useCart()
  const { theme } = useTheme()
  const { locale } = useI18n()
  const { mobileOpen, open, close } = useMobileSidebar()
  const isDark = theme === 'dark'
  const nl = locale === 'nl'

  const items = useMemo(
    () => cartState.items.filter((item) => productIsPurchasable(item.price)),
    [cartState.items]
  )
  const totalIncl = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )
  const euros = splitInclusiveVat(totalIncl)

  if (blocked) return null

  const pageBg = isDark ? 'bg-dark-900' : 'bg-gray-50'
  const card =
    isDark
      ? 'rounded-2xl border border-dark-700/70 bg-dark-800/60'
      : 'rounded-2xl border border-gray-200/80 bg-white/80'
  const aside =
    isDark
      ? 'h-fit rounded-2xl border border-dark-700/70 bg-dark-800/40 p-6'
      : 'h-fit rounded-2xl border border-gray-200/80 bg-gray-100/50 p-6'
  const muted = isDark ? 'text-gray-400' : 'text-gray-500'
  const text = isDark ? 'text-white' : 'text-gray-900'

  return (
    <div className={`flex min-h-screen overflow-x-hidden transition-colors duration-200 ${pageBg}`}>
      <Sidebar open={mobileOpen} onClose={close} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppStickyHeader
          title={nl ? 'Winkelwagen' : 'Cart'}
          showSocialProof
          leading={<SidebarMenuButton open={mobileOpen} onOpen={open} />}
          actions={<ShopHeroHeaderActions />}
        />

        <main className={`flex-1 transition-colors duration-200 ${pageBg}`}>
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
            <h1 className={`text-3xl font-semibold tracking-tight md:text-4xl ${text}`}>
              {nl ? 'Winkelwagen' : 'Cart'}
            </h1>
            <p className={`mt-2 ${muted}`}>
              {nl
                ? 'Controleer de onderstaande bestelling.'
                : 'Review your order before checkout.'}
            </p>

            <div className="mt-8">
              {items.length === 0 ? (
                <div className={`${aside} p-10 text-center`}>
                  <p className={muted}>
                    {nl ? 'Uw winkelwagen is leeg.' : 'Your cart is empty.'}
                  </p>
                  <Link
                    href={appPath('/')}
                    className="btn-primary mt-6 inline-flex rounded-2xl px-5 py-2.5 text-sm font-medium"
                  >
                    {nl ? 'Verder winkelen' : 'Continue shopping'}
                  </Link>
                </div>
              ) : (
                <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex flex-col gap-4 p-4 sm:flex-row ${card}`}
                      >
                        <div
                          className={`relative h-24 w-full shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-20 ${
                            isDark ? 'bg-dark-700' : 'bg-gray-100'
                          }`}
                        >
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 100vw, 80px"
                              unoptimized={shouldUnoptimizeProductImage(item.image_url)}
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={appPath(`/product/${item.productId || item.id.split('::')[0]}`)}
                            className={`font-medium hover:underline ${text}`}
                          >
                            {item.name}
                          </Link>
                          <p className={`mt-1 text-sm ${muted}`}>
                            {formatShopEuro(item.price, locale)}{' '}
                            <span aria-hidden>·</span>{' '}
                            {nl ? 'Inclusief 21% BTW' : 'Including 21% VAT'}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-4">
                            <QuantityStepper
                              label={nl ? 'Aantal' : 'Qty'}
                              value={item.quantity}
                              onChange={(next) => updateQuantity(item.id, next)}
                            />
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className={`text-sm underline-offset-2 hover:underline ${muted}`}
                            >
                              {nl ? 'Verwijderen' : 'Remove'}
                            </button>
                          </div>
                        </div>
                        <p className={`shrink-0 text-right font-semibold sm:pt-1 ${text}`}>
                          {formatShopEuro(item.price * item.quantity, locale)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <aside className={aside}>
                    <h2 className={`text-xl font-semibold ${text}`}>
                      {nl ? 'Overzicht' : 'Order summary'}
                    </h2>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className={muted}>
                          {nl ? 'Subtotaal excl. BTW' : 'Subtotal excl. VAT'}
                        </dt>
                        <dd className={text}>{formatShopEuro(euros.excl, locale)}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className={muted}>{nl ? 'BTW 21%' : 'VAT 21%'}</dt>
                        <dd className={text}>{formatShopEuro(euros.vat, locale)}</dd>
                      </div>
                      <div
                        className={`flex justify-between gap-4 border-t pt-3 text-base font-semibold ${
                          isDark ? 'border-dark-600' : 'border-gray-200'
                        }`}
                      >
                        <dt className={text}>
                          {nl ? 'Totaal incl. BTW' : 'Total incl. VAT'}
                        </dt>
                        <dd className={text}>{formatShopEuro(euros.incl, locale)}</dd>
                      </div>
                    </dl>
                    <p className={`mt-2 text-xs ${muted}`}>
                      {nl
                        ? 'Prijzen zijn inclusief 21% BTW en worden uitgesplitst op de factuur.'
                        : 'Prices include 21% VAT and will be itemized on the invoice.'}
                    </p>
                    <Link
                      href={appPath('/checkout')}
                      className="btn-primary mt-6 flex w-full items-center justify-center rounded-2xl py-3 text-base font-medium"
                    >
                      {nl ? 'Afrekenen' : 'Go to checkout'}
                    </Link>
                    <Link
                      href={appPath('/')}
                      className={`mt-2 flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-medium transition ${
                        isDark
                          ? 'text-gray-300 hover:bg-dark-700 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      }`}
                    >
                      {nl ? 'Verder winkelen' : 'Continue shopping'}
                    </Link>
                  </aside>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
