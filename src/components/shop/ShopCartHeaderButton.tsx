'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ShoppingBagIcon } from '@heroicons/react/24/outline'
import { useCart } from '@/lib/cart'
import { useShopCommerce } from '@/hooks/use-shop-commerce'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import { productIsPurchasable } from '@/lib/shop-commerce'
import { formatShopEuro, splitInclusiveVat } from '@/lib/shop-vat'
import { shouldUnoptimizeProductImage } from '@/lib/product-image-url'

const CLOSE_DELAY_MS = 180

type Props = {
  /** Override badge count (e.g. current product qty on product page). */
  badgeCount?: number
  className?: string
  title?: string
}

export default function ShopCartHeaderButton({
  badgeCount,
  className,
  title,
}: Props) {
  const { checkoutAllowed } = useShopCommerce()
  const { state: cartState } = useCart()
  const { theme } = useTheme()
  const { locale } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const isDark = theme === 'dark'
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  const items = useMemo(
    () => cartState.items.filter((item) => productIsPurchasable(item.price)),
    [cartState.items]
  )
  const count = badgeCount ?? (mounted ? items.reduce((sum, i) => sum + i.quantity, 0) : 0)
  const totalIncl = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )

  if (!checkoutAllowed) return null

  function clearCloseTimer() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }

  function scheduleClose() {
    clearCloseTimer()
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS)
  }

  const ariaLabel = title || (locale === 'nl' ? 'Winkelwagen' : 'Shopping cart')

  return (
    <div
      className={`relative shrink-0 ${className ?? ''}`}
      onMouseEnter={() => {
        clearCloseTimer()
        setOpen(true)
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
          isDark
            ? `text-gray-400 hover:bg-dark-800 hover:text-white ${open ? 'bg-dark-800 text-white' : ''}`
            : `text-gray-600 hover:bg-gray-200 hover:text-gray-900 ${open ? 'bg-gray-200 text-gray-900' : ''}`
        }`}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
            setOpen((v) => !v)
            return
          }
          router.push(appPath('/cart'))
        }}
      >
        <ShoppingBagIcon className="h-[22px] w-[22px]" />
        {count > 0 ? (
          <span className="absolute right-0 top-0 inline-flex min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 hidden pt-2 lg:block"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          <div
            className={`w-[min(92vw,20rem)] rounded-2xl border p-3 shadow-xl backdrop-blur-xl ${
              isDark
                ? 'border-dark-600/70 bg-dark-900/95'
                : 'border-gray-200/80 bg-white/95'
            }`}
          >
            <div className="mb-2 px-1">
              <p
                className={`text-sm font-semibold tracking-tight ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}
              >
                {locale === 'nl' ? 'Winkelwagen' : 'Cart'}
              </p>
            </div>

            {!mounted || items.length === 0 ? (
              <p
                className={`px-1 py-4 text-center text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {locale === 'nl' ? 'Uw winkelwagen is leeg.' : 'Your cart is empty.'}
              </p>
            ) : (
              <>
                <ul className="max-h-64 space-y-2 overflow-y-auto">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className={`flex gap-2.5 rounded-xl p-2 ${
                        isDark ? 'bg-dark-800/80' : 'bg-gray-100/80'
                      }`}
                    >
                      <div
                        className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-lg ${
                          isDark ? 'bg-dark-700' : 'bg-gray-200'
                        }`}
                      >
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="44px"
                            unoptimized={shouldUnoptimizeProductImage(item.image_url)}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-medium leading-snug ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {item.name}
                        </p>
                        <p
                          className={`mt-0.5 text-xs ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {item.quantity}× {formatShopEuro(item.price, locale)}
                        </p>
                      </div>
                      <p
                        className={`shrink-0 text-sm font-semibold tabular-nums ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        {formatShopEuro(item.price * item.quantity, locale)}
                      </p>
                    </li>
                  ))}
                </ul>

                <div
                  className={`mt-3 flex items-center justify-between gap-3 border-t px-1 pt-3 text-sm ${
                    isDark ? 'border-dark-600' : 'border-gray-200'
                  }`}
                >
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                    {locale === 'nl' ? 'Totaal incl. BTW' : 'Total incl. VAT'}
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {formatShopEuro(splitInclusiveVat(totalIncl).incl, locale)}
                  </span>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <Link
                    href={appPath('/cart')}
                    onClick={() => setOpen(false)}
                    className={`inline-flex h-9 w-full items-center justify-center rounded-xl border text-sm font-medium transition ${
                      isDark
                        ? 'border-dark-600 bg-dark-800/40 text-white hover:bg-dark-700'
                        : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {locale === 'nl' ? 'Ga naar winkelwagen' : 'Go to cart'}
                  </Link>
                  <Link
                    href={appPath('/checkout')}
                    onClick={() => setOpen(false)}
                    className="btn-primary inline-flex h-9 w-full items-center justify-center rounded-xl text-sm font-medium"
                  >
                    {locale === 'nl' ? 'Afrekenen' : 'Go to checkout'}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
