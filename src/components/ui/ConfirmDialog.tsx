'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '@/lib/theme'

type Props = {
  open: boolean
  title: string
  message?: string
  messageNode?: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  busyLabel?: string
  closeDialogLabel?: string
  confirmVariant?: 'danger' | 'primary'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  messageNode,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busyLabel = 'Please wait…',
  closeDialogLabel = 'Close dialog',
  confirmVariant = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onCancel()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown, true)
    requestAnimationFrame(() => panelRef.current?.focus())

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, busy, onCancel])

  if (!open || typeof document === 'undefined') return null

  const confirmClass =
    confirmVariant === 'danger'
      ? 'inline-flex min-h-[2.5rem] flex-1 items-center justify-center rounded-lg border border-red-600 bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:border-red-700 hover:bg-red-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 sm:flex-none sm:min-w-[7.5rem]'
      : 'btn-primary inline-flex min-h-[2.5rem] flex-1 items-center justify-center whitespace-nowrap px-3 py-2 text-sm sm:flex-none sm:min-w-[7.5rem]'

  const cancelClass = `inline-flex min-h-[2.5rem] flex-1 items-center justify-center whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 sm:flex-none sm:min-w-[7.5rem] ${
    isDark
      ? 'border-dark-600 bg-dark-800 text-gray-100 hover:bg-dark-700 focus-visible:ring-primary-500'
      : 'border-gray-300 bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-primary-500'
  }`

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center p-3 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label={closeDialogLabel}
        disabled={busy}
        onClick={onCancel}
      />

      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        tabIndex={-1}
        className={`relative z-10 w-full max-w-[min(100%,22rem)] rounded-xl border shadow-2xl outline-none sm:max-w-md ${
          isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="px-4 py-3.5 sm:px-6 sm:py-5">
          <h2
            id="confirm-dialog-title"
            className={`text-base font-semibold leading-snug sm:text-lg ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {title}
          </h2>
          <div
            id="confirm-dialog-message"
            className={`mt-2 text-sm leading-snug ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
          >
            {messageNode ?? message}
          </div>
        </div>

        <div
          className={`flex flex-row gap-2 border-t px-4 py-3 sm:justify-end sm:px-6 sm:py-4 ${
            isDark ? 'border-dark-700' : 'border-gray-200'
          }`}
        >
          <button type="button" className={cancelClass} disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={confirmClass} disabled={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
