import { APP_LOGO_MARK } from '@/lib/brand'

export default function BrandMark({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <div
      className={`bg-primary-500 rounded-lg flex items-center justify-center shrink-0 ${className}`}
      aria-hidden
    >
      <span className="text-white font-bold text-xs tracking-tight">{APP_LOGO_MARK}</span>
    </div>
  )
}
