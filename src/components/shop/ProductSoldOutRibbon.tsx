'use client'

import ProductRibbon from '@/components/shop/ProductRibbon'

type ProductSoldOutRibbonProps = {
  className?: string
  variant?: 'card' | 'gallery'
}

/** @deprecated Use ProductRibbon with kind="soldOut" */
export default function ProductSoldOutRibbon(props: ProductSoldOutRibbonProps) {
  return <ProductRibbon kind="soldOut" {...props} />
}
