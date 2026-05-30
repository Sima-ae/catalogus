import * as cheerio from 'cheerio'
import type { YupooAlbumData } from '@/lib/yupoo/types'
import { absoluteUrl } from '@/lib/yupoo/client'
import { parseAttributes } from '@/lib/yupoo/parse-attributes'
import {
  dedupeProductImageUrls,
  upgradeYupooImageUrl,
} from '@/lib/product-image-url'

function extractSkuHint(title: string): string | null {
  const match = title.match(/^(\d{5,})/)
  return match?.[1] ?? null
}

export { upgradeYupooImageUrl } from '@/lib/product-image-url'

function normalizeImageUrl(src: string, pageUrl: string): string | null {
  if (!src || src.startsWith('data:')) return null
  const url = upgradeYupooImageUrl(absoluteUrl(src, pageUrl))
  if (!/^https?:\/\//i.test(url)) return null
  if (url.includes('logo') || url.includes('avatar')) return null
  if (!/yupoo\.com/i.test(url) && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) return null
  return url
}

function collectFromHtml(html: string, pageUrl: string): string[] {
  const found: string[] = []

  const regexMatches =
    html.match(/https?:\/\/photo\.yupoo\.com\/[^\s"'<>]+?\.(?:jpe?g|png|webp|gif)/gi) || []
  for (const match of regexMatches) {
    const normalized = normalizeImageUrl(match, pageUrl)
    if (normalized) found.push(normalized)
  }

  return found
}

export function parseAlbumPage(html: string, albumUrl: string, albumId: string): YupooAlbumData {
  const $ = cheerio.load(html)

  const title =
    $('h1').first().text().trim() ||
    $('.album__title').first().text().trim() ||
    $('title').text().split('|')[0]?.trim() ||
    albumId

  const descriptionParts: string[] = []
  $(
    '.showalbumheader .text, .showalbumheader, .album_desc, .album-description, .showalbum__desc'
  ).each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim()
    if (t && t.length > 10 && !descriptionParts.includes(t)) {
      descriptionParts.push(t)
    }
  })

  if (!descriptionParts.length) {
    $('meta[name="description"]').each((_, el) => {
      const content = $(el).attr('content')?.trim()
      if (content) descriptionParts.push(content)
    })
  }

  const description = descriptionParts.join('\n\n').trim() || title

  const imageCandidates: string[] = []

  for (const url of collectFromHtml(html, albumUrl)) {
    imageCandidates.push(url)
  }

  const imageSelectors =
    '.showalbum__children img, .showalbum-image img, .album__img img, .image__main img, .showalbum img, img'

  $(imageSelectors).each((_, el) => {
    const src =
      $(el).attr('data-origin-src') ||
      $(el).attr('data-origin') ||
      $(el).attr('data-src') ||
      $(el).attr('data-original') ||
      $(el).attr('src')
    if (!src) return
    const normalized = normalizeImageUrl(src, albumUrl)
    if (normalized) imageCandidates.push(normalized)
  })

  $('a[href*=".jpg"], a[href*=".jpeg"], a[href*=".png"], a[href*=".webp"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return
    const normalized = normalizeImageUrl(href, albumUrl)
    if (normalized) imageCandidates.push(normalized)
  })

  const images = dedupeProductImageUrls(imageCandidates)

  return {
    albumId,
    albumUrl,
    title,
    description,
    images,
    skuHint: extractSkuHint(title),
  }
}

/** One SKU per Yupoo album; style prefix alone collides across albums. */
export function buildSku(album: YupooAlbumData): string {
  const id = String(album.albumId).trim()
  if (album.skuHint) {
    return `${album.skuHint}-${id}`
  }
  return `YUPOO-${id}`
}

export { parseAttributes }
