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
    const attrTitle = $link.attr('title')?.trim()
    let thumbTitle: string | undefined

    if (attrTitle && isSkuOnlyTitle(attrTitle)) {
      thumbTitle = attrTitle.replace(/\s+/g, '')
    } else {
      const fromSelectors = [
        $link.find('.album__title, .album_title, .title, .text_overflow').first().text().trim(),
        $link
          .closest('.album__main, .album-item, .album, li, .categories__children')
          .find('.album__title, .album_title, .text_overflow, .title')
          .first()
          .text()
          .trim(),
        $link.text().trim(),
      ]

      for (const text of fromSelectors) {
        if (!text) continue
        if (isSkuOnlyTitle(text)) {
          thumbTitle = text.replace(/\s+/g, '')
          break
        }
        const code = extractYupooStyleCode(text)
        if (code) {
          thumbTitle = code
          break
        }
      }

      if (!thumbTitle && attrTitle) {
        thumbTitle = extractYupooStyleCode(attrTitle) ?? undefined
      }
    }

    albums.push({ albumId, albumUrl, thumbTitle })
  })

  return albums
}
