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

export function CatalogModeProvider({
  children,
  initialCatalogMode,
}: {
  children: React.ReactNode
  initialCatalogMode?: boolean
}) {
  const [catalogMode, setCatalogMode] = useState(initialCatalogMode ?? false)
  const [ready, setReady] = useState(initialCatalogMode !== undefined)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(appPath('/api/catalog-mode'))
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
    if (initialCatalogMode !== undefined) return
    refresh()
  }, [refresh, initialCatalogMode])

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
