'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  defaultProductOptionSelection,
  resolveSelectedOptionPrices,
  type ProductOptions,
} from '@/lib/product-options'

export function useProductOptionSelection(
  basePrice: number,
  baseOriginalPrice: number | null | undefined,
  productOptions: ProductOptions | null | undefined
) {
  const defaults = useMemo(
    () => defaultProductOptionSelection(productOptions),
    [productOptions]
  )
  const [selected, setSelected] = useState<Record<string, string>>(defaults)

  useEffect(() => {
    setSelected(defaultProductOptionSelection(productOptions))
  }, [productOptions])

  const displayPrices = resolveSelectedOptionPrices(
    basePrice,
    baseOriginalPrice,
    productOptions,
    selected
  )

  return { selected, setSelected, displayPrices }
}
