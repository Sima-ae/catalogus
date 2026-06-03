'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from '@/lib/theme'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
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

  if (!open) return null

  const confirmClass =
    confirmVariant === 'danger'
      ? 'btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500'
      : 'btn-primary'

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="presentation">
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
        className={`relative z-10 w-full max-w-md rounded-xl border shadow-2xl outline-none ${
          isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <h2
            id="confirm-dialog-title"
            className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
          >
            {title}
          </h2>
          <p
            id="confirm-dialog-message"
            className={`mt-2 text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}
          >
            {message}
          </p>
        </div>

        <div
          className={`flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-6 ${
            isDark ? 'border-dark-700' : 'border-gray-200'
          }`}
        >
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${confirmClass} w-full sm:w-auto`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
