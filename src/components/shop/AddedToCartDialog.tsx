'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { appPath } from '@/lib/paths'
import { formatShopEuro } from '@/lib/shop-vat'
import { shouldUnoptimizeProductImage } from '@/lib/product-image-url'

export type AddedToCartProduct = {
  id: string
  name: string
  price: number
  image_url?: string
  quantity?: number
}

type Props = {
  open: boolean
  product: AddedToCartProduct | null
  onClose: () => void
}

export default function AddedToCartDialog({ open, product, onClose }: Props) {
  const { theme } = useTheme()
  const { t, locale } = useI18n()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || !product) return null

  const qty = product.quantity && product.quantity > 0 ? product.quantity : 1

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="added-to-cart-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label={t('product.addedDialog.close')}
        onClick={onClose}
      />
      <div
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl ${
          isDark
            ? 'border-dark-600 bg-dark-900 text-white'
            : 'border-gray-200 bg-white text-gray-900'
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4 border-inherit">
          <div>
            <p
              id="added-to-cart-title"
              className="text-lg font-semibold tracking-tight"
            >
              {t('product.addedDialog.title')}
            </p>
            <p className={`mt-0.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('product.addedDialog.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-xl p-1.5 transition ${
              isDark
                ? 'text-gray-400 hover:bg-dark-800 hover:text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
            aria-label={t('product.addedDialog.close')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-4 px-5 py-5">
          <div
            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl ${
              isDark ? 'bg-dark-800' : 'bg-gray-100'
            }`}
          >
            {product.image_url ? (
              <Image
                src={product.image_url}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized={shouldUnoptimizeProductImage(product.image_url)}
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-snug">{product.name}</p>
            <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {qty} × {formatShopEuro(product.price, locale)}
            </p>
            <p className="mt-2 text-base font-semibold tabular-nums">
              {formatShopEuro(product.price * qty, locale)}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 px-5 pb-5">
          <Link
            href={appPath('/cart')}
            onClick={onClose}
            className="btn-primary inline-flex h-11 w-full items-center justify-center rounded-2xl text-sm font-medium"
          >
            {t('product.goToCart')}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex h-11 w-full items-center justify-center rounded-2xl border text-sm font-medium transition ${
              isDark
                ? 'border-dark-600 bg-dark-800/50 text-white hover:bg-dark-700'
                : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
            }`}
          >
            {t('product.continueShopping')}
          </button>
        </div>
      </div>
    </div>
  )
}
