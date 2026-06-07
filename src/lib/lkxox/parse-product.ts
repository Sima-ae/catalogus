import { load } from 'cheerio'
import { lkxoxListingOrigin } from '@/lib/lkxox/client'
import {
  lkxoxExternalId,
  parseLkxoxProductIdFromUrl,
  type LkxoxProductData,
} from '@/lib/lkxox/types'
import { mapLkxoxProduct } from '@/lib/lkxox/map-product'

function resolveAbsoluteUrl(raw: string, baseOrigin: string, pageUrl: string): string | null {
  const href = String(raw ?? '').trim()
  if (!href || href.startsWith('data:')) return null
  if (/^https?:\/\//i.test(href)) return href.split('?')[0]
  if (href.startsWith('//')) return `https:${href}`.split('?')[0]
  try {
    return new URL(href, pageUrl).toString().split('?')[0]
  } catch {
    try {
      return new URL(href, `${baseOrigin}/`).toString().split('?')[0]
    } catch {
      return null
    }
  }
}

function isProductImageUrl(url: string): boolean {
  const lower = url.toLowerCase()
  if (!lower.includes('/images/')) return false
  if (lower.includes('bmz_cache/')) return false
  if (lower.includes('az_loading')) return false
  if (lower.includes('/icons/')) return false
  return /\.(jpe?g|png|webp|gif)(?:$|[?#])/i.test(url)
}

function normalizeTableLabel(text: string): string {
  return text.replace(/\s+/g, ' ').trim().replace(/:$/, '').toLowerCase()
}

function tableField($: ReturnType<typeof load>, label: string): string | null {
  const target = normalizeTableLabel(label)
  let value: string | null = null
  $('#productDescription table tr').each((_, tr) => {
    const th = normalizeTableLabel($(tr).find('th').first().text())
    if (th !== target) return
    const td = $(tr).find('td').first().text().replace(/\s+/g, ' ').trim()
    if (td) value = td
  })
  return value
}

function tableToDescription($: ReturnType<typeof load>): string {
  const rows: string[] = []
  $('#productDescription table tr').each((_, tr) => {
    const thRaw = $(tr).find('th').first().text().replace(/\s+/g, ' ').trim().replace(/:$/, '')
    const td = $(tr).find('td').first().text().replace(/\s+/g, ' ').trim()
    if (thRaw && td) rows.push(`${thRaw}: ${td}`)
  })
  return rows.join('\n')
}

export function parseLkxoxProductPage(html: string, pageUrl: string): LkxoxProductData {
  const $ = load(html)
  const baseHref = $('base').attr('href')?.trim()
  const baseOrigin = baseHref
    ? new URL(baseHref).origin
    : lkxoxListingOrigin(pageUrl)

  const productId = parseLkxoxProductIdFromUrl(pageUrl)
  if (!productId) {
    throw new Error(`Could not parse lkxox product id from URL: ${pageUrl}`)
  }

  const name = $('#productName').text().replace(/\s+/g, ' ').trim()
  if (!name) {
    throw new Error('Product title not found on page')
  }

  const stockNumber = tableField($, 'Stock Number')
  const brandName = tableField($, 'Brand')
  const description = tableToDescription($)

  const imageUrls: string[] = []
  const seen = new Set<string>()

  function pushImage(raw: string | undefined | null) {
    const absolute = resolveAbsoluteUrl(String(raw ?? ''), baseOrigin, pageUrl)
    if (!absolute || !isProductImageUrl(absolute)) return
    const key = absolute.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    imageUrls.push(absolute)
  }

  pushImage($('#productMainImage #jqzoom').first().attr('href'))
  pushImage($('#productMainImage #jqzoom').first().attr('src'))

  $('#productMainImage a[href]').each((_, el) => {
    pushImage($(el).attr('href'))
  })

  if (!imageUrls.length) {
    throw new Error('No product images found on page')
  }

  const retailText = $('#productPrices .normalprice').first().text()
  const permalink = pageUrl.split('?')[0]

  return mapLkxoxProduct({
    productId,
    externalId: lkxoxExternalId(productId),
    name,
    sku: stockNumber || lkxoxExternalId(productId),
    permalink,
    description,
    brandName,
    retailText,
    imageUrls,
  })
}
