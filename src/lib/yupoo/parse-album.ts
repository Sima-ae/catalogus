import * as cheerio from 'cheerio'
import type { YupooAlbumData } from '@/lib/yupoo/types'
import { absoluteUrl } from '@/lib/yupoo/client'
import { parseAttributes } from '@/lib/yupoo/parse-attributes'

function extractSkuHint(title: string): string | null {
  const match = title.match(/^(\d{5,})/)
  return match?.[1] ?? null
}

function normalizeImageUrl(src: string, pageUrl: string): string | null {
  if (!src || src.startsWith('data:')) return null
  const url = absoluteUrl(src, pageUrl)
  if (!/^https?:\/\//i.test(url)) return null
  if (url.includes('logo') || url.includes('avatar')) return null
  return url
}

export function parseAlbumPage(html: string, albumUrl: string, albumId: string): YupooAlbumData {
  const $ = cheerio.load(html)

  const title =
    $('h1').first().text().trim() ||
    $('.album__title').first().text().trim() ||
    $('title').text().split('|')[0]?.trim() ||
    albumId

  const descriptionParts: string[] = []
  $('.showalbumheader .text, .showalbumheader, .album_desc, .album-description').each(
    (_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim()
      if (t && t.length > 10 && !descriptionParts.includes(t)) {
        descriptionParts.push(t)
      }
    }
  )

  if (!descriptionParts.length) {
    $('meta[name="description"]').each((_, el) => {
      const content = $(el).attr('content')?.trim()
      if (content) descriptionParts.push(content)
    })
  }

  const description = descriptionParts.join('\n\n').trim() || title

  const imageSet = new Set<string>()
  $('img').each((_, el) => {
    const src =
      $(el).attr('data-origin') ||
      $(el).attr('data-src') ||
      $(el).attr('data-original') ||
      $(el).attr('src')
    if (!src) return
    const normalized = normalizeImageUrl(src, albumUrl)
    if (normalized) imageSet.add(normalized)
  })

  $('a[href*=".jpg"], a[href*=".jpeg"], a[href*=".png"], a[href*=".webp"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    const normalized = normalizeImageUrl(href, albumUrl)
    if (normalized) imageSet.add(normalized)
  })

  const images = Array.from(imageSet)

  return {
    albumId,
    albumUrl,
    title,
    description,
    images,
    skuHint: extractSkuHint(title),
  }
}

export function buildSku(album: YupooAlbumData): string {
  if (album.skuHint) return album.skuHint
  return `YUPOO-${album.albumId}`
}

export { parseAttributes }
