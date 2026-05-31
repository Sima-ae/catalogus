import Image from 'next/image'
import { APP_LOGO_WATERMARK_PATH } from '@/lib/brand'

type Variant = 'gallery' | 'lightbox'

const variantClass: Record<Variant, string> = {
  gallery: 'product-image-watermark product-image-watermark--gallery',
  lightbox: 'product-image-watermark product-image-watermark--lightbox',
}

/** Centered logo overlay for product photos (gallery + lightbox). */
export default function ProductImageWatermark({ variant = 'gallery' }: { variant?: Variant }) {
  return (
    <div className={variantClass[variant]} aria-hidden>
      <Image
        src={APP_LOGO_WATERMARK_PATH}
        alt=""
        width={640}
        height={120}
        className="product-image-watermark__logo"
        draggable={false}
        priority={variant === 'gallery'}
      />
    </div>
  )
}
