'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import PricelistProductLightbox from '@/components/pricelist/PricelistProductLightbox'
import { type ChatQuoteCardData } from '@/components/chat/ChatQuoteCard'
import { appPath } from '@/lib/paths'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { useAuth } from '@/lib/auth-local'
import { useI18n } from '@/lib/i18n-context'

type Props = {
  open: boolean
  quote: ChatQuoteCardData
  onClose: () => void
  onSendPrice?: (text: string) => void
  sending?: boolean
}

export default function ChatQuoteProductModal({
  open,
  quote,
  onClose,
  onSendPrice,
  sending,
}: Props) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [gallery, setGallery] = useState<string[]>([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [price, setPrice] = useState('')

  useEffect(() => {
    if (!open) return
    setPrice('')
    const images = quote.product_image_url ? [quote.product_image_url] : []
    setGallery(images)

    if (!quote.product_id) return

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(appPath(`/api/products/${quote.product_id}`), {
          credentials: 'include',
          headers: catalogAuthHeaders(user),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || cancelled) return
        const main = String(data.image_url ?? '').trim()
        const extra = Array.isArray(data.gallery_images)
          ? data.gallery_images.map((u: unknown) => String(u ?? '').trim()).filter(Boolean)
          : []
        const merged = Array.from(new Set([main, ...extra].filter(Boolean)))
        if (merged.length) setGallery(merged)
      } catch {
        // keep snapshot image only
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, quote, user])

  const thumbnails = useMemo(() => gallery.slice(0, 6), [gallery])

  if (!open) return null

  const sendPrice = () => {
    const trimmed = price.trim()
    if (!trimmed || !onSendPrice) return
    const label = quote.product_sku
      ? `${quote.product_name} (SKU ${quote.product_sku})`
      : quote.product_name
    onSendPrice(`Price for ${label}: ${trimmed}`)
    setPrice('')
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center bg-black/50 p-3">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-gray-900 truncate">{quote.product_name}</div>
              {quote.product_sku ? (
                <div className="text-sm text-gray-500">SKU {quote.product_sku}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-800 shrink-0"
            >
              {t('chat.close')}
            </button>
          </div>

          <div className="p-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                setLightboxIndex(0)
                setLightboxOpen(true)
              }}
              className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
            >
              {gallery[0] ? (
                <Image
                  src={gallery[0]}
                  alt={quote.product_name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 448px) 100vw, 448px"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                  No image
                </div>
              )}
            </button>

            {thumbnails.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto">
                {thumbnails.map((url, idx) => (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => {
                      setLightboxIndex(idx)
                      setLightboxOpen(true)
                    }}
                    className="relative h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-gray-200"
                  >
                    <Image src={url} alt="" fill className="object-cover" sizes="56px" unoptimized />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="text-sm text-gray-600 space-y-1">
              {quote.product_brand ? <div>{quote.product_brand}</div> : null}
              {quote.product_category ? <div>{quote.product_category}</div> : null}
            </div>

            {onSendPrice ? (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <label className="text-sm font-medium text-gray-800">{t('chat.yourPrice')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="€ 0,00"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={sendPrice}
                    disabled={sending || !price.trim()}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {t('chat.send')}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <PricelistProductLightbox
        open={lightboxOpen}
        productName={quote.product_name}
        images={gallery}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        overlayZClass="z-[10002]"
      />
    </>
  )
}
