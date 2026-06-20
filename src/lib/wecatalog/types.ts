export type WecatalogCurrTab = 'all' | 'new' | 'video' | 'photos'

export type WecatalogListContext = {
  origin: string
  shopId: string
  groupId: string
  currTab: WecatalogCurrTab
  listRefererUrl: string
}

export type WecatalogListItem = {
  goodsId: string
  externalId: string
  permalink: string
  title: string
  shopId: string
}

export type WecatalogProductData = {
  goodsId: string
  externalId: string
  shopId: string
  name: string
  sku: string
  permalink: string
  description: string
  price: number
  purchasePrice: number | null
  originalPrice: number | null
  brandName: string | null
  imageUrls: string[]
}

export type WecatalogPagination = {
  pageTimestamp?: string | number
  isLoadMore?: boolean
  dataFromGoodsNumAndMarkCode?: boolean
}

export type WecatalogListResult = {
  items?: WecatalogCommodityListItem[]
  pagination?: WecatalogPagination
  tagTitle?: string
}

export type WecatalogCommodityListItem = {
  goods_id?: string
  selfGoodsId?: string
  parent_goods_id?: string
  title?: string
  shop_id?: string
  goodsNum?: string
  imgs?: string[]
  imgsSrc?: string[]
}

export type WecatalogCommodityDetail = {
  goods_id?: string
  selfGoodsId?: string
  parent_goods_id?: string
  title?: string
  desc?: string
  shop_id?: string
  goodsNum?: string
  itemPrice?: string | number
  skuPriceMap?: Record<string, string | number>
  imgs?: string[]
  imgsSrc?: string[]
}

export type WecatalogApiResponse<T> = {
  errcode: number
  errmsg?: string
  result?: T
}

const EXTERNAL_PREFIX = 'wecatalog-'

export function wecatalogExternalId(goodsId: string): string {
  const id = String(goodsId ?? '').trim()
  if (!id) throw new Error('WeCatalog goods id is required')
  return `${EXTERNAL_PREFIX}${id}`
}

export function parseWecatalogExternalId(externalId: string): string | null {
  const raw = String(externalId ?? '').trim()
  if (!raw.startsWith(EXTERNAL_PREFIX)) return null
  const id = raw.slice(EXTERNAL_PREFIX.length).trim()
  return id || null
}

export function parseWecatalogGoodsIdFromUrl(url: string): { shopId: string; goodsId: string } | null {
  const raw = String(url ?? '').trim()
  const match = raw.match(/\/(?:weshop\/)?(?:goods|product)\/([^/?#]+)\/([^/?#]+)/i)
  if (!match) return null
  const shopId = match[1].trim()
  const goodsId = match[2].trim()
  if (!shopId || !goodsId) return null
  return { shopId, goodsId }
}

export function wecatalogProductPermalink(
  origin: string,
  shopId: string,
  goodsId: string
): string {
  const base = String(origin ?? '').replace(/\/+$/, '')
  return `${base}/weshop/product/${shopId}/${goodsId}`
}
