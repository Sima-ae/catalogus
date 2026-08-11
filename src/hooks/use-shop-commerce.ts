'use client'

import { useMemo } from 'react'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { useSiteBrand } from '@/lib/site-brand-context'
import {
  productIsPurchasable,
  showAddToCartCta,
  storeAllowsCheckout,
} from '@/lib/shop-commerce'

/** Client hook: featured ignores catalog_mode; priced products get ATC. */
export function useShopCommerce(price?: number | string | null) {
  const { catalogMode, ready } = useCatalogMode()
  const { storeMode } = useSiteBrand()

  return useMemo(() => {
    const checkoutAllowed = storeAllowsCheckout(storeMode, catalogMode)
    const purchasable =
      price === undefined ? false : productIsPurchasable(price)
    return {
      ready,
      storeMode,
      catalogMode,
      checkoutAllowed,
      purchasable,
      showAddToCart:
        price === undefined
          ? checkoutAllowed
          : showAddToCartCta(price, storeMode, catalogMode),
    }
  }, [catalogMode, price, ready, storeMode])
}
