'use client'

import Image from 'next/image'
import { useChatMessageText } from '@/hooks/useChatMessageText'

export type ChatQuoteCardData = {
  id: string
  product_id?: string | null
  product_name: string
  product_sku: string | null
  product_image_url: string | null
  product_brand: string | null
  product_category: string | null
  status: string
  supplier_conversation_id?: string | null
}

type ChatQuoteCardProps = {
  quote: ChatQuoteCardData
  compact?: boolean
  actions?: React.ReactNode
  onClick?: () => void
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  with_supplier: 'bg-blue-100 text-blue-800',
  answered: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
}

export default function ChatQuoteCard({ quote, compact, actions, onClick }: ChatQuoteCardProps) {
  const { t, quoteStatusLabel } = useChatMessageText()
  const statusClass = STATUS_STYLES[quote.status] ?? STATUS_STYLES.pending
  const statusLabel = quoteStatusLabel(quote.status)

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-gray-50 overflow-hidden ${
        compact ? 'text-xs' : 'text-sm'
      } ${onClick ? 'cursor-pointer hover:border-blue-300' : ''}`}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-14 w-14 shrink-0 rounded-md overflow-hidden bg-white border border-gray-200">
          {quote.product_image_url ? (
            <Image
              src={quote.product_image_url}
              alt={quote.product_name}
              fill
              className="object-cover"
              sizes="56px"
              unoptimized
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400 text-[10px]">
              {t('chat.noImg')}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 truncate">{quote.product_name}</div>
          {quote.product_sku ? (
            <div className="text-gray-500 truncate">
              {t('chat.sku', { sku: quote.product_sku })}
            </div>
          ) : null}
          {(quote.product_brand || quote.product_category) && (
            <div className="text-gray-500 truncate">
              {[quote.product_brand, quote.product_category].filter(Boolean).join(' · ')}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass}`}>
              {statusLabel}
            </span>
            {quote.supplier_conversation_id ? (
              <span className="text-[10px] text-gray-500">{t('chat.supplierThreadLinked')}</span>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? (
        <div
          className="px-3 pb-3 flex flex-wrap gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}
