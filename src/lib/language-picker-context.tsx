'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type LanguagePickerContextValue = {
  open: boolean
  openPicker: () => void
  closePicker: () => void
  togglePicker: () => void
}

const LanguagePickerContext = createContext<LanguagePickerContextValue | null>(null)

export function LanguagePickerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const openPicker = useCallback(() => setOpen(true), [])
  const closePicker = useCallback(() => setOpen(false), [])
  const togglePicker = useCallback(() => setOpen((v) => !v), [])

  const value = useMemo(
    () => ({ open, openPicker, closePicker, togglePicker }),
    [open, openPicker, closePicker, togglePicker]
  )

  return (
    <LanguagePickerContext.Provider value={value}>{children}</LanguagePickerContext.Provider>
  )
}

export function useLanguagePicker(): LanguagePickerContextValue {
  const ctx = useContext(LanguagePickerContext)
  if (!ctx) {
    return {
      open: false,
      openPicker: () => {},
      closePicker: () => {},
      togglePicker: () => {},
    }
  }
  return ctx
}
