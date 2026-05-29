import * as cheerio from 'cheerio'
import type { YupooAlbumLink } from '@/lib/yupoo/types'
import { absoluteUrl } from '@/lib/yupoo/client'

export function parseCategoryAlbums(html: string, categoryUrl: string): YupooAlbumLink[] {
  const $ = cheerio.load(html)
  const seen = new Set<string>()
  const albums: YupooAlbumLink[] = []

  $('a[href*="/albums/"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return

    const match = href.match(/\/albums\/(\d+)/)
    if (!match?.[1]) return

    const albumId = match[1]
    if (seen.has(albumId)) return
    seen.add(albumId)

    const albumUrl = absoluteUrl(href, categoryUrl)
    const thumbTitle = $(el).attr('title') || $(el).text().trim().slice(0, 120) || undefined

    albums.push({ albumId, albumUrl, thumbTitle })
  })

  return albums
}
