'use client'

import { useState } from 'react'
import { TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import { parseJsonResponse } from '@/lib/fetch-json'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useI18n } from '@/lib/i18n-context'
import { translateTrashApiError } from '@/lib/i18n-product-trash'
import { useTheme } from '@/lib/theme'

type Props = {
  productId: string
  productName?: string
  size?: 'sm' | 'md'
  className?: string
  onDeleted?: () => void
}

export default function ProductCardDeleteButton({
  productId,
  productName,
  size = 'sm',
  className = '',
  onDeleted,
}: Props) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (authLoading || !user || !isAdmin) return null

  const iconClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch(appPath('/api/admin/products/bulk-delete'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: [productId] }),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) {
        throw new Error(translateTrashApiError(data.error, t))
      }
      setConfirmOpen(false)
      onDeleted?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(translateTrashApiError(msg, t))
    } finally {
      setBusy(false)
    }
  }

  const label = productName?.trim() || t('product.trash.defaultName')
  const nameClass = isDark ? 'text-white' : 'text-gray-900'

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`rounded-full p-1.5 bg-black/50 hover:bg-red-600/90 text-white transition-colors disabled:opacity-50 ${className}`}
        aria-label={t('product.trash.ariaLabel')}
        title={t('product.trash.buttonTitle')}
      >
        <TrashIcon className={iconClass} />
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title={t('product.trash.confirmTitle')}
        messageNode={
          error ? (
            <p>{t('product.trash.errorRetry', { error })}</p>
          ) : (
            <>
              <p className={`font-medium line-clamp-2 break-words ${nameClass}`}>&ldquo;{label}&rdquo;</p>
              <p className="mt-2">{t('product.trash.confirmHint')}</p>
            </>
          )
        }
        confirmLabel={
          <>
            <span className="sm:hidden">{t('product.trash.confirmButtonShort')}</span>
            <span className="hidden sm:inline">{t('product.trash.confirmButton')}</span>
          </>
        }
        cancelLabel={t('product.trash.cancel')}
        busyLabel={t('product.trash.busy')}
        closeDialogLabel={t('confirm.closeDialog')}
        confirmVariant="danger"
        busy={busy}
        onConfirm={() => void handleConfirm()}
        onCancel={() => {
          if (busy) return
          setConfirmOpen(false)
          setError('')
        }}
      />
    </>
  )
}
