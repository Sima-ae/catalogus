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

type ProductCardDisplayContextValue = {
  /** When false, cards show only image and title. */
  showCardDetails: boolean
  ready: boolean
  refresh: () => Promise<void>
}

const ProductCardDisplayContext = createContext<ProductCardDisplayContextValue>({
  showCardDetails: true,
  ready: false,
  refresh: async () => {},
})

export function ProductCardDisplayProvider({ children }: { children: React.ReactNode }) {
  const [showCardDetails, setShowCardDetails] = useState(true)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(appPath('/api/product-card-display'), { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && typeof data.showCardDetails === 'boolean') {
        setShowCardDetails(data.showCardDetails)
      }
    } catch {
      setShowCardDetails(true)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ showCardDetails, ready, refresh }),
    [showCardDetails, ready, refresh]
  )

  return (
    <ProductCardDisplayContext.Provider value={value}>
      {children}
    </ProductCardDisplayContext.Provider>
  )
}

export function useProductCardDisplay() {
  return useContext(ProductCardDisplayContext)
}
