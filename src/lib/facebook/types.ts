export type FacebookPostData = {
  postUrl: string
  externalId: string
  title: string
  description: string
  imageUrls: string[]
  detectedPriceHint: number | null
}

export type FacebookManualImportFields = {
  price: number
  sku: string
  category_id: string
  category: string
  brand: string | null
}

export type FacebookJobItemRawJson = {
  manual: FacebookManualImportFields
  detectedPriceHint?: number | null
}
