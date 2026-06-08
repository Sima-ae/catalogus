import { lkxoxPriceToDecimal, type LkxoxProductData } from '@/lib/lkxox/types'

export function mapLkxoxPrices(input: {
  regularText: string | null
  saleText: string | null
}): { purchasePrice: number | null; originalPrice: number | null } {
  const regular = lkxoxPriceToDecimal(input.regularText)
  const sale = lkxoxPriceToDecimal(input.saleText)
  const purchasePrice = sale ?? regular
  const originalPrice =
    sale != null && regular != null && regular > sale ? regular : null
  return { purchasePrice, originalPrice }
}

export function mapLkxoxProduct(input: {
  productId: number
  externalId: string
  name: string
  sku: string
  permalink: string
  description: string
  brandName: string | null
  regularText: string | null
  saleText: string | null
  imageUrls: string[]
}): LkxoxProductData {
  const { purchasePrice, originalPrice } = mapLkxoxPrices({
    regularText: input.regularText,
    saleText: input.saleText,
  })

  return {
    productId: input.productId,
    externalId: input.externalId,
    name: input.name.trim(),
    sku: input.sku.trim(),
    permalink: input.permalink.trim(),
    description: input.description.trim(),
    price: 0,
    purchasePrice,
    originalPrice,
    brandName: input.brandName?.trim() || null,
    imageUrls: input.imageUrls.filter(Boolean),
  }
}
