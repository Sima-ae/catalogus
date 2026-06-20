'use client'

import { useChat } from '@/components/chat/ChatProvider'
import { useI18n } from '@/lib/i18n-context'

type AskPriceButtonProps = {
  productId: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  disabled?: boolean
}

const SIZE_CLASSES = {
  sm: 'px-2.5 py-1 text-[10px] sm:text-xs',
  md: 'px-3.5 py-1.5 text-xs sm:text-sm',
  lg: 'px-4 py-2 text-sm sm:text-base md:text-lg',
} as const

export default function AskPriceButton({
  productId,
  size = 'md',
  className = '',
  onClick,
  disabled,
}: AskPriceButtonProps) {
  const { t } = useI18n()
  const { requestQuote } = useChat()

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event)
        if (disabled) return
        requestQuote({ productId })
      }}
      className={`inline-flex items-center justify-center rounded-full font-semibold leading-tight text-white bg-primary-500 shadow-md hover:bg-primary-600 active:scale-[0.98] transition-[transform,background-color] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${SIZE_CLASSES[size]} ${className}`}
    >
      {t('product.priceOnRequest')}
    </button>
  )
}
