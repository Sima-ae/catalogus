import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'
import type { YupooAlbumData } from '@/lib/yupoo/types'
import { absoluteUrl } from '@/lib/yupoo/client'
import { parseAttributes } from '@/lib/yupoo/parse-attributes'
import {
  cleanProductGalleryUrls,
  isBrandingGalleryImageUrl,
  upgradeYupooImageUrl,
} from '@/lib/product-image-url'
import { brandSkuPrefix } from '@/lib/product-sku'
import {
  extractYupooStyleCode,
} from '@/lib/yupoo/import-text'

function extractSkuHint(title: string): string | null {
  return extractYupooStyleCode(title)
}

export { upgradeYupooImageUrl } from '@/lib/product-image-url'

function normalizeImageUrl(src: string, pageUrl: string): string | null {
  if (!src || src.startsWith('data:')) return null
  const url = upgradeYupooImageUrl(absoluteUrl(src, pageUrl))
  if (!/^https?:\/\//i.test(url)) return null
  if (isBrandingGalleryImageUrl(url)) return null
  if (!/yupoo\.com/i.test(url) && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) return null
  return url
}

function isBrandingImageElement($: cheerio.CheerioAPI, el: Element): boolean {
  const $el = $(el)
  const alt = ($el.attr('alt') || $el.attr('title') || '').trim()
  if (/weibo|sinaweibo|微博|yupoo\s*logo|又拍/i.test(alt)) return true

  const link =
    $el.closest('a').attr('href') ||
    $el.parent('a').attr('href') ||
    ''
  if (/weibo\.com|sinaweibo|weibo/i.test(link)) return true

  return false
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

  const h1 =
    $('h1').first().text().trim() ||
    $('.album__title').first().text().trim() ||
    $('title').text().split('|')[0]?.trim() ||
    ''

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

  const description = descriptionParts.join('\n\n').trim() || h1

  const headerCode =
    $('.showalbumheader .sku, .showalbumheader .code, .album_code').first().text().trim() ||
    ''

  const imageCandidates: string[] = []

  for (const url of collectFromHtml(html, albumUrl)) {
    imageCandidates.push(url)
  }

  const imageSelectors =
    '.showalbum__children img, .showalbum-image img, .album__img img, .image__main img, .showalbum img, img'

  $(imageSelectors).each((_, el) => {
    if (isBrandingImageElement($, el)) return
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

  const images = cleanProductGalleryUrls(imageCandidates)

  return {
    albumId,
    albumUrl,
    title: h1 || 'Untitled',
    description,
    images,
    skuHint: extractSkuHint(h1) || extractSkuHint(headerCode),
  }
}

/** One SKU per Yupoo album + brand; style code alone collides across brands. */
export function buildSku(album: YupooAlbumData, brandName?: string | null): string {
  const id = String(album.albumId).trim()
  const brand = brandSkuPrefix(brandName)
  const code = album.skuHint || 'YUPOO'
  if (brand) return `${brand}-${code}-${id}`
  return album.skuHint ? `${album.skuHint}-${id}` : `YUPOO-${id}`
}

export { parseAttributes }
