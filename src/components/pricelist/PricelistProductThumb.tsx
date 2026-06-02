'use client'

import { useState } from 'react'
import Image from 'next/image'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { shouldUnoptimizeProductImage } from '@/lib/product-image-url'
import { pricelistImageSrc } from '@/lib/pricelist-image'

type Props = {
  imageUrl: string
  alt: string
  className?: string
  sizes?: string
  /** Opens product gallery lightbox instead of navigating away. */
  onOpenGallery?: () => void
}

export default function PricelistProductThumb({
  imageUrl,
  alt,
  className = 'relative w-14 h-14 rounded overflow-hidden bg-gray-100',
  sizes = '56px',
  onOpenGallery,
}: Props) {
  const [failed, setFailed] = useState(false)
  const src = pricelistImageSrc(imageUrl)

  const inner = (
    <>
      {src && !failed ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          className="object-contain"
          unoptimized={shouldUnoptimizeProductImage(imageUrl)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
          <PhotoIcon className="w-6 h-6" aria-hidden />
        </div>
      )}
    </>
  )

  if (onOpenGallery) {
    return (
      <button
        type="button"
        onClick={onOpenGallery}
        className={`block shrink-0 cursor-zoom-in text-left ${className}`}
        aria-label={alt}
      >
        {inner}
      </button>
    )
  }

  return <div className={className}>{inner}</div>
}
