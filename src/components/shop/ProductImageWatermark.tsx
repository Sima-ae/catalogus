import { APP_LOGO_WATERMARK_PATH } from '@/lib/brand'

type Variant = 'gallery' | 'lightbox'

/** Centered logo overlay for product photos (gallery + lightbox). */
export default function ProductImageWatermark({ variant = 'gallery' }: { variant?: Variant }) {
  const logoWidth =
    variant === 'lightbox' ? 'w-[min(68%,32rem)]' : 'w-[min(62%,26rem)]'

  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static watermark from /public */}
      <img
        src={APP_LOGO_WATERMARK_PATH}
        alt=""
        width={1067}
        height={300}
        draggable={false}
        className={`h-auto max-w-full select-none opacity-[0.62] ${logoWidth}`}
        style={{
          filter:
            'drop-shadow(0 0 2px rgba(0,0,0,0.95)) drop-shadow(0 0 10px rgba(0,0,0,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
        }}
      />
    </div>
  )
}
