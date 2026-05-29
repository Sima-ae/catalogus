'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { appPath } from '@/lib/paths'

type CatalogModeContextValue = {
  catalogMode: boolean
  ready: boolean
  refresh: () => Promise<void>
}

const CatalogModeContext = createContext<CatalogModeContextValue>({
  catalogMode: false,
  ready: false,
  refresh: async () => {},
})

export function CatalogModeProvider({ children }: { children: React.ReactNode }) {
  const [catalogMode, setCatalogMode] = useState(false)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(appPath('/api/catalog-mode'), { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && typeof data.catalogMode === 'boolean') {
        setCatalogMode(data.catalogMode)
      }
    } catch {
      setCatalogMode(false)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ catalogMode, ready, refresh }),
    [catalogMode, ready, refresh]
  )

  return (
    <CatalogModeContext.Provider value={value}>{children}</CatalogModeContext.Provider>
  )
}

export function useCatalogMode() {
  return useContext(CatalogModeContext)
}
