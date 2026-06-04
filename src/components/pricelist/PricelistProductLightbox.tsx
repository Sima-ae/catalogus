'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline'
import ProductImageWatermark from '@/components/shop/ProductImageWatermark'
import { useI18n } from '@/lib/i18n-context'
import { pricelistImageSrc } from '@/lib/pricelist-image'

type Props = {
  open: boolean
  productName: string
  images: string[]
  initialIndex?: number
  onClose: () => void
  /** Defaults to z-[100]; use z-[130] when opened inside modals (e.g. edit product). */
  overlayZClass?: string
  /** Defaults to pricelistImageSrc; pass identity when URLs are already display-ready. */
  resolveImageSrc?: (url: string) => string
}

export default function PricelistProductLightbox({
  open,
  productName,
  images,
  initialIndex = 0,
  onClose,
  overlayZClass = 'z-[100]',
  resolveImageSrc = pricelistImageSrc,
}: Props) {
  const { t } = useI18n()
  const [selectedIndex, setSelectedIndex] = useState(initialIndex)
  const lightboxRef = useRef<HTMLDivElement>(null)
  const lightboxTouchStart = useRef<{ x: number; y: number } | null>(null)
  const lightboxDidSwipe = useRef(false)

  useEffect(() => {
    if (!open) return
    setSelectedIndex(Math.min(Math.max(0, initialIndex), Math.max(0, images.length - 1)))
  }, [open, initialIndex, images.length])

  const goToPrevious = useCallback(() => {
    if (images.length <= 1) return
    setSelectedIndex((i) => (i - 1 + images.length) % images.length)
  }, [images.length])

  const goToNext = useCallback(() => {
    if (images.length <= 1) return
    setSelectedIndex((i) => (i + 1) % images.length)
  }, [images.length])

  useEffect(() => {
    if (!open || images.length === 0) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (images.length <= 1) return
      if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault()
        goToPrevious()
      }
      if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault()
        goToNext()
      }
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown, true)
    requestAnimationFrame(() => lightboxRef.current?.focus())
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, images.length, onClose, goToPrevious, goToNext])

  const handleTouchStart = (e: React.TouchEvent) => {
    lightboxDidSwipe.current = false
    const touch = e.touches[0]
    if (!touch) return
    lightboxTouchStart.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = lightboxTouchStart.current
    lightboxTouchStart.current = null
    if (!start || images.length <= 1) return
    const touch = e.changedTouches[0]
    if (!touch) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return
    lightboxDidSwipe.current = true
    if (dx > 0) goToPrevious()
    else goToNext()
  }

  const closeFromBackdrop = () => {
    if (lightboxDidSwipe.current) {
      lightboxDidSwipe.current = false
      return
    }
    onClose()
  }

  if (!open || images.length === 0) return null

  const current = images[selectedIndex]
  const src = current ? resolveImageSrc(current) : ''

  return (
    <div
      ref={lightboxRef}
      tabIndex={-1}
      className={`fixed inset-0 ${overlayZClass} flex items-center justify-center p-4 sm:p-8 outline-none touch-none`}
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} — image ${selectedIndex + 1} of ${images.length}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        aria-label={t('product.closeImage')}
        onClick={closeFromBackdrop}
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-20 rounded-lg bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
        aria-label={t('product.close')}
      >
        <XMarkIcon className="h-6 w-6" />
      </button>
      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goToPrevious()
            }}
            className="absolute left-2 sm:left-6 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
            aria-label={t('product.previousImage')}
          >
            <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goToNext()
            }}
            className="absolute right-2 sm:right-6 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 transition-colors"
            aria-label={t('product.nextImage')}
          >
            <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      ) : null}
      <div className="relative z-10 inline-flex max-h-[92vh] max-w-[min(calc(96vw-5rem),1400px)] items-center justify-center">
        {src ? (
          /* eslint-disable-next-line @next/next/no-img-element -- full-resolution lightbox */
          <img
            key={src}
            src={src}
            alt={`${productName} — image ${selectedIndex + 1}`}
            className="relative z-0 max-h-[92vh] max-w-full w-auto h-auto object-contain select-none pointer-events-none"
            draggable={false}
          />
        ) : null}
        <ProductImageWatermark variant="lightbox" />
      </div>
    </div>
  )
}
