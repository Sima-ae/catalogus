'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PhotoIcon } from '@heroicons/react/24/outline'
import { shouldUnoptimizeProductImage } from '@/lib/product-image-url'
import { pricelistImageSrc } from '@/lib/pricelist-image'
import { appPath } from '@/lib/paths'

type Props = {
  productId?: string
  imageUrl: string
  alt: string
  className?: string
  sizes?: string
  /** When false, render only the image box (parent provides the link). */
  linked?: boolean
}

export default function PricelistProductThumb({
  productId,
  imageUrl,
  alt,
  className = 'relative w-14 h-14 rounded overflow-hidden bg-gray-100',
  sizes = '56px',
  linked = true,
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

  if (linked && productId) {
    return (
      <Link href={appPath(`/product/${productId}`)} className={`block shrink-0 ${className}`}>
        {inner}
      </Link>
    )
  }

  return <div className={className}>{inner}</div>
}
