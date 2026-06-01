'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { appPath } from '@/lib/paths'
import {
  DEFAULT_SHOP_CURRENCY,
  getCurrencySymbol,
  normalizeCurrencyCode,
  type ShopCurrencyCode,
} from '@/lib/currency'
import { setActiveShopCurrencyCode } from '@/lib/format-price'

type ShopCurrencyContextValue = {
  currencyCode: ShopCurrencyCode
  symbol: string
}

const ShopCurrencyContext = createContext<ShopCurrencyContextValue>({
  currencyCode: DEFAULT_SHOP_CURRENCY,
  symbol: getCurrencySymbol(DEFAULT_SHOP_CURRENCY),
})

export function ShopCurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<ShopCurrencyCode>(DEFAULT_SHOP_CURRENCY)

  useEffect(() => {
    let cancelled = false
    fetch(appPath('/api/settings/public'), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.currency) return
        setCurrencyCode(normalizeCurrencyCode(data.currency))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setActiveShopCurrencyCode(currencyCode)
  }, [currencyCode])

  const value = useMemo(
    () => ({
      currencyCode,
      symbol: getCurrencySymbol(currencyCode),
    }),
    [currencyCode]
  )

  return <ShopCurrencyContext.Provider value={value}>{children}</ShopCurrencyContext.Provider>
}

export function useShopCurrency() {
  return useContext(ShopCurrencyContext)
}
