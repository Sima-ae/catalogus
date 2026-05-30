import * as cheerio from 'cheerio'
import type { YupooAlbumLink } from '@/lib/yupoo/types'
import { absoluteUrl } from '@/lib/yupoo/client'
import { extractYupooStyleCode, isSkuOnlyTitle } from '@/lib/yupoo/import-text'

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
    const $link = $(el)
    const thumbTitle = pickCategoryThumbTitle($link)

    albums.push({ albumId, albumUrl, thumbTitle })
  })

  return albums
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickCategoryThumbTitle($link: cheerio.Cheerio<any>): string | undefined {
  const attrTitle = $link.attr('title')?.trim()
  if (attrTitle && isSkuOnlyTitle(attrTitle)) return attrTitle.replace(/\s+/g, '')

  const fromSelectors = [
    $link.find('.album__title, .album_title, .title, .text_overflow').first().text().trim(),
    $link.closest('.album__main, .album-item, .album, li, .categories__children')
      .find('.album__title, .album_title, .text_overflow, .title')
      .first()
      .text()
      .trim(),
    $link.text().trim(),
  ]

  for (const text of fromSelectors) {
    if (!text) continue
    if (isSkuOnlyTitle(text)) return text.replace(/\s+/g, '')
    const code = extractYupooStyleCode(text)
    if (code) return code
  }

  if (attrTitle) {
    const code = extractYupooStyleCode(attrTitle)
    if (code) return code
  }

  return undefined
}
