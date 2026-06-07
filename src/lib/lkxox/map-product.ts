import { lkxoxPriceToDecimal, type LkxoxProductData } from '@/lib/lkxox/types'

export function mapLkxoxProduct(input: {
  productId: number
  externalId: string
  name: string
  sku: string
  permalink: string
  description: string
  brandName: string | null
  retailText: string | null
  imageUrls: string[]
}): LkxoxProductData {
  return {
    productId: input.productId,
    externalId: input.externalId,
    name: input.name.trim(),
    sku: input.sku.trim(),
    permalink: input.permalink.trim(),
    description: input.description.trim(),
    price: 0,
    originalPrice: lkxoxPriceToDecimal(input.retailText),
    brandName: input.brandName?.trim() || null,
    imageUrls: input.imageUrls.filter(Boolean),
  }
}
