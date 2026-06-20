import { lettersOnlyBrandKey } from '@/lib/product-brand-text'
import type { WecatalogCommodityDetail, WecatalogProductData } from '@/lib/wecatalog/types'
import { wecatalogExternalId } from '@/lib/wecatalog/types'

export function normalizeWecatalogImageUrl(url: string): string {
  return String(url ?? '').trim().split('?')[0]
}

export function collectWecatalogImageUrls(commodity: WecatalogCommodityDetail): string[] {
  const raw = [...(commodity.imgsSrc ?? []), ...(commodity.imgs ?? [])]
  const seen = new Set<string>()
  const out: string[] = []
  for (const url of raw) {
    const normalized = normalizeWecatalogImageUrl(url)
    if (!normalized || !/^https?:\/\//i.test(normalized)) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(normalized)
  }
  return out
}

export function parseWecatalogPrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const cleaned = raw.replace(/[^0-9.,]/g, '').replace(/,/g, '')
  const parsed = parseFloat(cleaned)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

export function purchasePriceFromCommodity(commodity: WecatalogCommodityDetail): number | null {
  const fromItem = parseWecatalogPrice(commodity.itemPrice)
  if (fromItem != null) return fromItem
  const map = commodity.skuPriceMap
  if (map && typeof map === 'object') {
    for (const value of Object.values(map)) {
      const parsed = parseWecatalogPrice(value)
      if (parsed != null) return parsed
    }
  }
  return null
}

export function splitWecatalogTitleAndDescription(title: string): { name: string; description: string } {
  const raw = String(title ?? '').replace(/\r\n/g, '\n').trim()
  if (!raw) return { name: '', description: '' }
  const lines = raw.split('\n')
  const name = lines[0]?.trim() || raw
  const body = lines.slice(1).join('\n').trim()
  return { name, description: body }
}

export function detectBrandFromTitle(title: string, brandNames: string[]): string | null {
  const key = lettersOnlyBrandKey(title)
  if (!key) return null

  const sorted = [...brandNames]
    .map((name) => String(name ?? '').trim())
    .filter(Boolean)
    .sort((a, b) => lettersOnlyBrandKey(b).length - lettersOnlyBrandKey(a).length)

  for (const brand of sorted) {
    const brandKey = lettersOnlyBrandKey(brand)
    if (brandKey.length >= 3 && key.includes(brandKey)) return brand
  }
  return null
}

export function mapWecatalogProduct(input: {
  shopId: string
  goodsId: string
  permalink: string
  commodity: WecatalogCommodityDetail
  brandName?: string | null
}): WecatalogProductData {
  const goodsId =
    String(input.commodity.selfGoodsId ?? input.commodity.goods_id ?? input.commodity.parent_goods_id ?? input.goodsId).trim() ||
    input.goodsId
  const { name, description } = splitWecatalogTitleAndDescription(String(input.commodity.title ?? '').trim())
  const sku = String(input.commodity.goodsNum ?? '').trim() || goodsId
  const purchasePrice = purchasePriceFromCommodity(input.commodity)

  return {
    goodsId,
    externalId: wecatalogExternalId(goodsId),
    shopId: input.shopId,
    name,
    sku,
    permalink: input.permalink,
    description,
    price: 0,
    purchasePrice,
    originalPrice: null,
    brandName: input.brandName?.trim() || null,
    imageUrls: collectWecatalogImageUrls(input.commodity),
  }
}
