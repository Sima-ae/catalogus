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
}

export type ParsedAttributes = {
  sizes: string | null
  colors: string | null
}
