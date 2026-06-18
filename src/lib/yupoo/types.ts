export type YupooAlbumLink = {
  albumId: string
  albumUrl: string
  thumbTitle?: string
}

export type YupooAlbumData = {
  albumId: string
  albumUrl: string
  title: string
  description: string
  images: string[]
  skuHint: string | null
  /** Yupoo album datePublished (YYYY-MM-DD), shown on the album page. */
  albumDate: string | null
}

export type ParsedAttributes = {
  sizes: string | null
  colors: string | null
}
