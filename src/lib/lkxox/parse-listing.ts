import { load } from 'cheerio'
import {
  fetchLkxoxHtml,
  lkxoxListingPageUrl,
  normalizeLkxoxListUrl,
  sleep,
} from '@/lib/lkxox/client'
import { lkxoxExternalId, parseLkxoxProductIdFromUrl, type LkxoxListItem } from '@/lib/lkxox/types'

const PRODUCTS_PER_PAGE = 24

export type LkxoxListingSummary = {
  totalProducts: number
  totalPages: number
}

export function parseLkxoxListingSummary(html: string): LkxoxListingSummary {
  const $ = load(html)
  const text =
    $('#newProductsDefaultListingTopNumber').text().trim() ||
    $('#newProductsDefaultListingBottomNumber').text().trim()
  const match = text.match(/of\s+(\d+)\s+new products/i)
  const totalProducts = match ? Number(match[1]) : 0
  const totalPages = totalProducts > 0 ? Math.ceil(totalProducts / PRODUCTS_PER_PAGE) : 0
  return { totalProducts, totalPages }
}

export function parseLkxoxListingPage(html: string, listUrl: string): LkxoxListItem[] {
  const $ = load(html)
  const baseOrigin = new URL(normalizeLkxoxListUrl(listUrl)).origin
  const seen = new Set<number>()
  const items: LkxoxListItem[] = []

  $('#newProductsDefault .musheji_name a[href*="-p-"]').each((_, el) => {
    const href = String($(el).attr('href') ?? '').trim()
    if (!href) return
    const absolute = href.startsWith('http') ? href : new URL(href, `${baseOrigin}/`).toString()
    const productId = parseLkxoxProductIdFromUrl(absolute)
    if (!productId || seen.has(productId)) return
    seen.add(productId)
    const title = $(el).attr('title')?.trim() || $(el).text().trim() || `Product ${productId}`
    items.push({
      productId,
      externalId: lkxoxExternalId(productId),
      permalink: absolute.split('?')[0],
      title,
    })
  })

  return items
}

export async function discoverAllLkxoxListItems(listUrl: string): Promise<LkxoxListItem[]> {
  const normalized = normalizeLkxoxListUrl(listUrl)
  const firstHtml = await fetchLkxoxHtml(lkxoxListingPageUrl(normalized, 1))
  const summary = parseLkxoxListingSummary(firstHtml)
  const totalPages = summary.totalPages || 1

  const byId = new Map<number, LkxoxListItem>()
  for (const item of parseLkxoxListingPage(firstHtml, normalized)) {
    byId.set(item.productId, item)
  }

  for (let page = 2; page <= totalPages; page++) {
    await sleep(400)
    const html = await fetchLkxoxHtml(lkxoxListingPageUrl(normalized, page))
    for (const item of parseLkxoxListingPage(html, normalized)) {
      byId.set(item.productId, item)
    }
    if (page % 10 === 0) {
      console.log(`==> Lkxox listing discovery: page ${page}/${totalPages} (${byId.size} products)`)
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.productId - b.productId)
}

export function lkxoxListItemsToJobItems(
  items: LkxoxListItem[]
): { externalId: string; permalink: string; title: string }[] {
  return items.map((item) => ({
    externalId: item.externalId,
    permalink: item.permalink,
    title: item.title,
  }))
}
