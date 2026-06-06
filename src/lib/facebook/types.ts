export type FacebookPostData = {
  postUrl: string
  externalId: string
  title: string
  description: string
  imageUrls: string[]
  detectedPriceHint: number | null
  /** Facebook-reported carousel size when present in page JSON. */
  carouselImageCount?: number
}

export type FacebookManualImportFields = {
  price: number
  sku: string
  category_id: string
  category: string
  brand: string | null
}

/** Admin form fields before SKU is auto-generated at queue time. */
export type FacebookManualImportInput = Omit<FacebookManualImportFields, 'sku'>

export type FacebookJobItemRawJson = {
  manual: FacebookManualImportFields
  detectedPriceHint?: number | null
}
