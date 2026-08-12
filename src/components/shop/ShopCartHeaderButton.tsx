'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ShoppingBagIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useCart } from '@/lib/cart'
import { useShopCommerce } from '@/hooks/use-shop-commerce'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import { productIsPurchasable } from '@/lib/shop-commerce'
import { formatShopEuro, splitInclusiveVat } from '@/lib/shop-vat'
import { shouldUnoptimizeProductImage } from '@/lib/product-image-url'
import { QuantityStepper } from '@/components/shop/QuantityStepper'

const CLOSE_DELAY_MS = 180

type Props = {
  className?: string
  title?: string
}

export default function ShopCartHeaderButton({ className, title }: Props) {
  const { checkoutAllowed } = useShopCommerce()
  const { state: cartState, updateQuantity, removeItem } = useCart()
  const { theme } = useTheme()
  const { t, locale } = useI18n()
  const pathname = usePathname()
  const isDark = theme === 'dark'
  const rootRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [desktop, setDesktop] = useState(false)
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nl = locale === 'nl'

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  useEffect(() => {
    if (!open || !desktop) {
      setPanelPos(null)
      return
    }

    const update = () => {
      const el = rootRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPanelPos({
        top: Math.round(rect.bottom + 8),
        right: Math.round(window.innerWidth - rect.right),
      })
    }

    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, desktop])

  const items = useMemo(
    () => cartState.items.filter((item) => productIsPurchasable(item.price)),
    [cartState.items]
  )
  const count = mounted ? items.reduce((sum, i) => sum + i.quantity, 0) : 0
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

  const ariaLabel = title || t('product.goToCart')
  const cartHref = appPath('/cart')
  const checkoutHref = appPath('/checkout')
  const removeLabel = nl ? 'Verwijderen' : 'Remove'

  const panel =
    mounted && open && desktop && panelPos
      ? createPortal(
          <div
            className="fixed z-[200]"
            style={{ top: panelPos.top, right: panelPos.right }}
            onMouseEnter={() => {
              clearCloseTimer()
              setOpen(true)
            }}
            onMouseLeave={scheduleClose}
          >
            <div
              className={`w-[min(92vw,22rem)] rounded-2xl border p-3 shadow-xl backdrop-blur-xl ${
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
                  {t('product.cartTitle')}
                </p>
              </div>

              {items.length === 0 ? (
                <p
                  className={`px-1 py-4 text-center text-sm ${
                    isDark ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  {t('product.emptyCart')}
                </p>
              ) : (
                <>
                  <ul className="max-h-[min(36rem,70vh)] space-y-2 overflow-y-auto">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className={`rounded-xl p-2 ${
                          isDark ? 'bg-dark-800/80' : 'bg-gray-100/80'
                        }`}
                      >
                        <div className="flex gap-2.5">
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
                            <div className="flex items-start gap-2">
                              <p
                                className={`min-w-0 flex-1 truncate text-sm font-medium leading-snug ${
                                  isDark ? 'text-white' : 'text-gray-900'
                                }`}
                              >
                                {item.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className={`shrink-0 rounded-md p-1 transition ${
                                  isDark
                                    ? 'text-gray-500 hover:bg-dark-700 hover:text-red-400'
                                    : 'text-gray-400 hover:bg-white hover:text-red-600'
                                }`}
                                aria-label={removeLabel}
                                title={removeLabel}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                            <p
                              className={`mt-0.5 text-xs ${
                                isDark ? 'text-gray-400' : 'text-gray-500'
                              }`}
                            >
                              {formatShopEuro(item.price, locale)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 pl-[3.25rem]">
                          <QuantityStepper
                            size="sm"
                            value={item.quantity}
                            onChange={(next) => updateQuantity(item.id, next)}
                          />
                          <p
                            className={`shrink-0 text-sm font-semibold tabular-nums ${
                              isDark ? 'text-white' : 'text-gray-900'
                            }`}
                          >
                            {formatShopEuro(item.price * item.quantity, locale)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div
                    className={`mt-3 flex items-center justify-between gap-3 border-t px-1 pt-3 text-sm ${
                      isDark ? 'border-dark-600' : 'border-gray-200'
                    }`}
                  >
                    <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                      {nl ? 'Totaal incl. BTW' : 'Total incl. VAT'}
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
                      href={cartHref}
                      onClick={() => setOpen(false)}
                      className={`inline-flex h-9 w-full items-center justify-center rounded-xl border text-sm font-medium transition ${
                        isDark
                          ? 'border-dark-600 bg-dark-800/40 text-white hover:bg-dark-700'
                          : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {t('product.goToCart')}
                    </Link>
                    <Link
                      href={checkoutHref}
                      onClick={() => setOpen(false)}
                      className="btn-primary inline-flex h-9 w-full items-center justify-center rounded-xl text-sm font-medium"
                    >
                      {t('product.toCheckout')}
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <div
      ref={rootRef}
      className={`relative shrink-0 ${className ?? ''}`}
      onMouseEnter={() => {
        if (!desktop) return
        clearCloseTimer()
        setOpen(true)
      }}
      onMouseLeave={() => {
        if (!desktop) return
        scheduleClose()
      }}
    >
      <Link
        href={cartHref}
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
          isDark
            ? `text-gray-400 hover:bg-dark-800 hover:text-white ${open ? 'bg-dark-800 text-white' : ''}`
            : `text-gray-600 hover:bg-gray-200 hover:text-gray-900 ${open ? 'bg-gray-200 text-gray-900' : ''}`
        }`}
        aria-label={ariaLabel}
        title={ariaLabel}
        onClick={() => setOpen(false)}
      >
        <ShoppingBagIcon className="h-[22px] w-[22px]" aria-hidden />
        {count > 0 ? (
          <span className="absolute right-0 top-0 inline-flex min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </Link>
      {panel}
    </div>
  )
}
