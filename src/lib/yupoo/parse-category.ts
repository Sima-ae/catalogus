import * as cheerio from 'cheerio'
import type { YupooAlbumLink } from '@/lib/yupoo/types'
import { absoluteUrl, sleep } from '@/lib/yupoo/client'
import { extractYupooStyleCode, isSkuOnlyTitle } from '@/lib/yupoo/import-text'

export type YupooCategoryPaginationSummary = {
  totalAlbums: number
  totalPages: number
  currentPage: number
}

/** Read Yupoo category pagination (e.g. "1 / 14", "共1670个相册", "共14页"). */
export function parseCategoryPaginationSummary(html: string): YupooCategoryPaginationSummary {
  const $ = cheerio.load(html)

  let totalPages = 0
  let currentPage = 1
  let totalAlbums = 0

  const spanText = $('.categories__box-right-pagination-span').first().text().trim()
  const spanMatch = spanText.match(/(\d+)\s*\/\s*(\d+)/)
  if (spanMatch) {
    currentPage = Number(spanMatch[1]) || 1
    totalPages = Number(spanMatch[2]) || 0
  }

  const jumpText = $('.pagination__jumpwrap').text()
  const pagesMatch = jumpText.match(/共\s*(\d+)\s*页/)
  if (pagesMatch) {
    totalPages = Math.max(totalPages, Number(pagesMatch[1]) || 0)
  }

  const wrapText = $('.categories__box-right-pagination-wrap').text()
  const albumsMatch = wrapText.match(/共\s*(\d+)\s*个相册/)
  if (albumsMatch) {
    totalAlbums = Number(albumsMatch[1]) || 0
  }

  if (!totalPages) totalPages = 1

  return { totalAlbums, totalPages, currentPage }
}

/** Build a paginated Yupoo category URL (`?page=2`, etc.). */
export function yupooCategoryPageUrl(categoryUrl: string, page: number): string {
  const url = new URL(categoryUrl.trim())
  if (page <= 1) {
    url.searchParams.delete('page')
  } else {
    url.searchParams.set('page', String(page))
  }
  return url.href
}

export type FetchCategoryHtml = (url: string) => Promise<string>

/** Fetch every album link across all Yupoo category listing pages. */
export async function discoverAllCategoryAlbums(
  categoryUrl: string,
  fetchHtmlFn: FetchCategoryHtml,
  options?: {
    onPage?: (page: number, totalPages: number, albumCount: number) => void
    sleepMs?: number
  }
): Promise<YupooAlbumLink[]> {
  const normalized = categoryUrl.trim()
  const firstHtml = await fetchHtmlFn(normalized)
  const summary = parseCategoryPaginationSummary(firstHtml)
  const totalPages = summary.totalPages || 1

  const byId = new Map<string, YupooAlbumLink>()
  for (const album of parseCategoryAlbums(firstHtml, normalized)) {
    byId.set(album.albumId, album)
  }

  const sleepMs = options?.sleepMs ?? 400
  for (let page = 2; page <= totalPages; page++) {
    if (sleepMs > 0) await sleep(sleepMs)
    const pageUrl = yupooCategoryPageUrl(normalized, page)
    const html = await fetchHtmlFn(pageUrl)
    for (const album of parseCategoryAlbums(html, normalized)) {
      byId.set(album.albumId, album)
    }
    options?.onPage?.(page, totalPages, byId.size)
  }

  return Array.from(byId.values())
}

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
