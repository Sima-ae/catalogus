'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  LinkIcon,
  PhotoIcon,
  StarIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { appPath } from '@/lib/paths'
import {
  normalizeProductImageUrl,
  shouldUnoptimizeProductImage,
  toDisplayProductImageUrl,
} from '@/lib/product-image-url'
import PricelistProductLightbox from '@/components/pricelist/PricelistProductLightbox'
import { useAppTheme } from '@/lib/theme-classes'
import { useI18n } from '@/lib/i18n-context'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { useAuth } from '@/lib/auth-local'

function galleryLinesToList(lines: string): string[] {
  return lines
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildImageList(mainUrl: string, galleryLines: string): string[] {
  const main = mainUrl.trim()
  const gallery = galleryLinesToList(galleryLines)
  const list: string[] = []
  if (main) list.push(main)
  for (const url of gallery) {
    if (url !== main) list.push(url)
  }
  return list
}

function listToFormFields(list: string[]): { main: string; galleryLines: string } {
  if (!list.length) return { main: '', galleryLines: '' }
  return {
    main: list[0] ?? '',
    galleryLines: list.slice(1).join('\n'),
  }
}

const HOLD_MS = 180
const MOVE_CANCEL_PX = 8

function reorderImageList(list: string[], fromUrl: string, toUrl: string): string[] {
  const from = list.indexOf(fromUrl)
  const to = list.indexOf(toUrl)
  if (from < 0 || to < 0 || from === to) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

type ImageDragState = {
  url: string
  pointerId: number
  startX: number
  startY: number
  holdTimer: number | null
  active: boolean
}

type Props = {
  imageUrl: string
  galleryLines: string
  sourceUrl?: string
  onChange: (next: { image_url: string; gallery_images: string }) => void
  authHeaders?: Record<string, string>
}

function formatPixelSize(width: number, height: number): string {
  if (width > 0 && height > 0) return `${width}×${height}`
  return ''
}

function GalleryImageTile({
  displaySrc,
  alt,
  isMain,
  setAsMainLabel,
  mainBadgeLabel,
  removeAriaLabel,
  removeTitle,
  onSetAsMain,
  onRemove,
  onOpenLightbox,
  viewFullSizeLabel,
  border,
  tileBg,
}: {
  displaySrc: string
  alt: string
  isMain: boolean
  setAsMainLabel: string
  mainBadgeLabel: string
  removeAriaLabel: string
  removeTitle: string
  onSetAsMain: () => void
  onRemove: () => void
  onOpenLightbox: () => void
  viewFullSizeLabel: string
  border: string
  tileBg: string
}) {
  const [pixelSize, setPixelSize] = useState<string | null>(null)

  return (
    <div
      className={`group relative aspect-square overflow-hidden rounded-lg border ${border} ${tileBg}`}
    >
      <button
        type="button"
        onClick={onOpenLightbox}
        className="absolute inset-0 z-[5] cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
        aria-label={viewFullSizeLabel}
      />
      <Image
        src={displaySrc}
        alt={alt}
        fill
        className="object-cover pointer-events-none"
        sizes="(max-width: 640px) 50vw, 200px"
        unoptimized={shouldUnoptimizeProductImage(displaySrc)}
        onLoad={(e) => {
          const { naturalWidth, naturalHeight } = e.currentTarget
          const label = formatPixelSize(naturalWidth, naturalHeight)
          setPixelSize(label || null)
        }}
      />

      {isMain ? (
        <span className="absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-md bg-primary-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          <StarIcon className="h-3 w-3" aria-hidden />
          {mainBadgeLabel}
        </span>
      ) : (
        <button
          type="button"
          onClick={onSetAsMain}
          className="absolute left-2 top-2 z-20 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        >
          {setAsMainLabel}
        </button>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 z-20 rounded-lg bg-black/60 p-1.5 text-white transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        aria-label={removeAriaLabel}
        title={removeTitle}
      >
        <TrashIcon className="h-4 w-4" aria-hidden />
      </button>

      {pixelSize ? (
        <span
          className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white pointer-events-none"
          aria-hidden
        >
          {pixelSize}
        </span>
      ) : null}
    </div>
  )
}

export default function ProductImageGalleryEditor({
  imageUrl,
  galleryLines,
  sourceUrl = '',
  onChange,
  authHeaders: authHeadersProp,
}: Props) {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { user } = useAuth()
  const authHeaders = authHeadersProp ?? catalogAuthHeaders(user)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const images = useMemo(
    () => buildImageList(imageUrl, galleryLines),
    [imageUrl, galleryLines]
  )

  const [uploading, setUploading] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [draggingUrl, setDraggingUrl] = useState<string | null>(null)
  const [overUrl, setOverUrl] = useState<string | null>(null)
  const dragRef = useRef<ImageDragState | null>(null)
  const suppressClickRef = useRef(false)

  const reorderEnabled = images.length > 1

  const displayImages = useMemo(
    () => images.map((url) => toDisplayProductImageUrl(url, sourceUrl) || url),
    [images, sourceUrl]
  )

  const applyList = useCallback(
    (list: string[]) => {
      const { main, galleryLines: lines } = listToFormFields(list)
      onChange({ image_url: main, gallery_images: lines })
    },
    [onChange]
  )

  const addUrl = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) return
    const normalized = normalizeProductImageUrl(trimmed)
    if (!normalized) {
      setLocalError(tr('productForm.imagesInvalidUrl'))
      return
    }
    setLocalError(null)
    applyList([...images, normalized])
    setUrlDraft('')
    setUrlOpen(false)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setLocalError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(appPath('/api/product-images/upload'), {
        method: 'POST',
        headers: authHeaders,
        body,
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error || tr('productForm.imagesUploadFailed'))
      }
      applyList([...images, data.url])
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : tr('productForm.imagesUploadFailed'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAt = (index: number) => {
    const next = [...images]
    next.splice(index, 1)
    applyList(next)
  }

  const setAsMain = (index: number) => {
    if (index === 0) return
    const next = [...images]
    const [picked] = next.splice(index, 1)
    next.unshift(picked)
    applyList(next)
  }

  const clearDrag = useCallback(() => {
    const d = dragRef.current
    if (d?.holdTimer) clearTimeout(d.holdTimer)
    dragRef.current = null
    setDraggingUrl(null)
    setOverUrl(null)
  }, [])

  const finishDrag = useCallback(
    (fromUrl: string, toUrl: string) => {
      const next = reorderImageList(images, fromUrl, toUrl)
      if (next === images) return
      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
      applyList(next)
    },
    [applyList, images]
  )

  const onTilePointerDown = (e: React.PointerEvent<HTMLDivElement>, url: string) => {
    if (!reorderEnabled || uploading) return
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, textarea, select')) return

    const holdTimer = window.setTimeout(() => {
      if (!dragRef.current || dragRef.current.url !== url) return
      dragRef.current.active = true
      setDraggingUrl(url)
    }, HOLD_MS)

    dragRef.current = {
      url,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      holdTimer,
      active: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onTilePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return

    const moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY)
    if (!d.active && moved > MOVE_CANCEL_PX) {
      if (d.holdTimer) clearTimeout(d.holdTimer)
      dragRef.current = null
      return
    }

    if (!d.active) return

    e.preventDefault()
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const sortable = el?.closest('[data-gallery-sortable]') as HTMLElement | null
    setOverUrl(sortable?.dataset.gallerySortable ?? null)
  }

  const onTilePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return

    if (d.holdTimer) clearTimeout(d.holdTimer)

    const dropUrl = overUrl
    const wasActive = d.active
    const dragUrl = d.url

    clearDrag()
    e.currentTarget.releasePointerCapture(e.pointerId)

    if (wasActive && dropUrl && dropUrl !== dragUrl) {
      finishDrag(dragUrl, dropUrl)
    }
  }

  const onTilePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d || e.pointerId !== d.pointerId) return
    clearDrag()
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const border = t.isDark ? 'border-dark-600' : 'border-gray-200'
  const tileBg = t.isDark ? 'bg-dark-800' : 'bg-gray-50'

  return (
    <div className="space-y-4">
      <p className="form-hint">{tr('productForm.imagesHint')}</p>

      {localError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {localError}
        </p>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((url, index) => {
          const displaySrc = toDisplayProductImageUrl(url, sourceUrl) || url
          const isMain = index === 0
          const isDragging = draggingUrl === url
          const isOver = overUrl === url && draggingUrl != null && !isDragging
          return (
            <div
              key={url}
              data-gallery-sortable={url}
              onPointerDown={(e) => onTilePointerDown(e, url)}
              onPointerMove={onTilePointerMove}
              onPointerUp={onTilePointerUp}
              onPointerCancel={onTilePointerCancel}
              onClickCapture={(e) => {
                if (suppressClickRef.current || draggingUrl) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
              className={`relative transition-shadow duration-150 ${
                reorderEnabled ? 'cursor-grab active:cursor-grabbing touch-none' : ''
              } ${isDragging ? 'z-20 scale-[0.98] opacity-55 shadow-lg' : ''} ${
                isOver ? 'ring-2 ring-primary-500 ring-offset-2 rounded-lg' : ''
              }`}
              style={reorderEnabled ? { touchAction: 'none' } : undefined}
            >
              <GalleryImageTile
                displaySrc={displaySrc}
                alt={
                  isMain
                    ? tr('productForm.imagesMainAlt')
                    : tr('productForm.imagesGalleryAlt', { index: index + 1 })
                }
                isMain={isMain}
                setAsMainLabel={tr('productForm.imagesSetAsMain')}
                mainBadgeLabel={tr('productForm.imagesMainBadge')}
                removeAriaLabel={
                  isMain ? tr('productForm.imagesRemoveMain') : tr('productForm.imagesRemove')
                }
                removeTitle={tr('productForm.imagesRemoveTitle')}
                onSetAsMain={() => setAsMain(index)}
                onRemove={() => removeAt(index)}
                onOpenLightbox={() => {
                  if (suppressClickRef.current) return
                  setLightboxIndex(index)
                }}
                viewFullSizeLabel={tr('product.viewImageFullSize', {
                  name: tr('productForm.sectionImages'),
                })}
                border={border}
                tileBg={tileBg}
              />
            </div>
          )
        })}

        <div
          className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-3 ${border} ${tileBg}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadFile(file)
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary text-xs w-full flex items-center justify-center gap-1.5 py-2"
          >
            <PhotoIcon className="h-4 w-4 shrink-0" aria-hidden />
            {uploading ? tr('productForm.imagesUploading') : tr('productForm.imagesUploadFile')}
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              setUrlOpen((o) => !o)
              setLocalError(null)
            }}
            className="btn-secondary text-xs w-full flex items-center justify-center gap-1.5 py-2"
          >
            <LinkIcon className="h-4 w-4 shrink-0" aria-hidden />
            {tr('productForm.imagesAddUrl')}
          </button>
        </div>
      </div>

      {urlOpen ? (
        <div
          className={`rounded-lg border p-4 space-y-3 ${border} ${
            t.isDark ? 'bg-dark-800/80' : 'bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="product-image-url-add" className="form-label mb-0">
              {tr('productForm.imagesUrlLabel')}
            </label>
            <button
              type="button"
              className={`p-1 rounded ${t.iconBtn}`}
              onClick={() => setUrlOpen(false)}
              aria-label={tr('productForm.close')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <input
            id="product-image-url-add"
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder={tr('productForm.imagesUrlPlaceholder')}
            className="input w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addUrl(urlDraft)
              }
            }}
          />
          <button
            type="button"
            className="btn-primary text-sm"
            onClick={() => addUrl(urlDraft)}
          >
            {tr('productForm.imagesAddImage')}
          </button>
        </div>
      ) : null}

      {!images.length ? (
        <p className={`text-sm ${t.muted}`}>
          {tr('productForm.imagesEmpty')}
        </p>
      ) : null}

      <details className={`text-sm ${t.muted}`}>
        <summary className="cursor-pointer select-none hover:underline">
          {tr('productForm.imagesAdvancedSummary')}
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="image_url_text" className="form-label">
              {tr('productForm.imagesMainUrl')}
            </label>
            <input
              id="image_url_text"
              name="image_url"
              className="input w-full font-mono text-xs"
              value={imageUrl}
              onChange={(e) =>
                onChange({ image_url: e.target.value, gallery_images: galleryLines })
              }
            />
          </div>
          <div>
            <label htmlFor="gallery_images_text" className="form-label">
              {tr('productForm.imagesGalleryUrls')}
            </label>
            <textarea
              id="gallery_images_text"
              name="gallery_images"
              rows={4}
              className="input w-full font-mono text-xs"
              value={galleryLines}
              onChange={(e) =>
                onChange({ image_url: imageUrl, gallery_images: e.target.value })
              }
            />
          </div>
        </div>
      </details>

      <PricelistProductLightbox
        open={lightboxIndex !== null && displayImages.length > 0}
        productName={tr('productForm.sectionImages')}
        images={displayImages}
        initialIndex={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
        overlayZClass="z-[130]"
        resolveImageSrc={(url) => url}
      />
    </div>
  )
}
