import { createWecatalogSession, sleep, type WecatalogSession } from '@/lib/wecatalog/client'
import type {
  WecatalogCommodityListItem,
  WecatalogListItem,
  WecatalogListResult,
} from '@/lib/wecatalog/types'
import { wecatalogExternalId, wecatalogProductPermalink } from '@/lib/wecatalog/types'

function resolveListItemGoodsId(item: WecatalogCommodityListItem): string | null {
  const id = String(item.selfGoodsId ?? item.goods_id ?? item.parent_goods_id ?? '').trim()
  return id || null
}

function listItemToWecatalogListItem(
  item: WecatalogCommodityListItem,
  origin: string,
  fallbackShopId: string
): WecatalogListItem | null {
  const goodsId = resolveListItemGoodsId(item)
  if (!goodsId) return null
  const shopId = String(item.shop_id ?? fallbackShopId).trim() || fallbackShopId
  const title = String(item.title ?? '').trim() || goodsId
  return {
    goodsId,
    externalId: wecatalogExternalId(goodsId),
    permalink: wecatalogProductPermalink(origin, shopId, goodsId),
    title,
    shopId,
  }
}

export async function discoverAllWecatalogListItems(
  listUrl: string,
  session?: WecatalogSession
): Promise<WecatalogListItem[]> {
  const activeSession = session ?? createWecatalogSession(listUrl)
  const context = activeSession.getContext()
  const byId = new Map<string, WecatalogListItem>()

  let slipType = 0
  let timestamp = ''
  let page = 0

  while (true) {
    page++
    if (page > 1) await sleep(200)

    const response = await activeSession.postAlbumList({
      currTab: context.currTab,
      albumId: context.shopId,
      tagGroupId: context.groupId,
      slipType,
      timestamp,
      transLang: 'en',
    })

    if (response.errcode !== 0) {
      throw new Error(response.errmsg || `WeCatalog list fetch failed (${response.errcode})`)
    }

    const result = response.result as WecatalogListResult | undefined
    const items = result?.items ?? []
    for (const item of items) {
      const mapped = listItemToWecatalogListItem(item, context.origin, context.shopId)
      if (mapped) byId.set(mapped.goodsId, mapped)
    }

    const pagination = result?.pagination
    if (page % 10 === 0 || !pagination?.isLoadMore) {
      console.log(
        `==> WeCatalog listing discovery: page ${page} (${byId.size} products, loadMore=${Boolean(pagination?.isLoadMore)})`
      )
    }

    if (!pagination?.isLoadMore) break

    slipType = 1
    timestamp = String(pagination.pageTimestamp ?? '')
    if (!timestamp) break
  }

  return Array.from(byId.values()).sort((a, b) => a.goodsId.localeCompare(b.goodsId))
}

export function wecatalogListItemsToJobItems(
  items: WecatalogListItem[]
): { externalId: string; permalink: string; title: string }[] {
  return items.map((item) => ({
    externalId: item.externalId,
    permalink: item.permalink,
    title: item.title,
  }))
}
