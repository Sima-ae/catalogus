import type { WecatalogSession } from '@/lib/wecatalog/client'
import { detectBrandFromTitle, mapWecatalogProduct } from '@/lib/wecatalog/map-product'
import type { WecatalogCommodityDetail, WecatalogProductData } from '@/lib/wecatalog/types'
import { wecatalogProductPermalink } from '@/lib/wecatalog/types'

type CommodityViewResult = {
  commodity?: WecatalogCommodityDetail
}

export async function fetchWecatalogProduct(
  session: WecatalogSession,
  shopId: string,
  goodsId: string,
  brandNames: string[] = []
): Promise<WecatalogProductData> {
  const response = await session.getCommodityView(shopId, goodsId)
  if (response.errcode !== 0) {
    throw new Error(response.errmsg || `WeCatalog commodity view failed (${response.errcode})`)
  }

  const commodity = (response.result as CommodityViewResult | undefined)?.commodity
  if (!commodity) {
    throw new Error('WeCatalog commodity view returned no product data')
  }

  const resolvedGoodsId =
    String(commodity.selfGoodsId ?? commodity.goods_id ?? commodity.parent_goods_id ?? goodsId).trim() ||
    goodsId
  const resolvedShopId = String(commodity.shop_id ?? shopId).trim() || shopId
  const title = String(commodity.title ?? '').trim()
  const brandName = detectBrandFromTitle(title, brandNames)

  const mapped = mapWecatalogProduct({
    shopId: resolvedShopId,
    goodsId: resolvedGoodsId,
    permalink: wecatalogProductPermalink(session.getContext().origin, resolvedShopId, resolvedGoodsId),
    commodity,
    brandName,
  })

  if (!mapped.name) {
    throw new Error('WeCatalog product title is empty')
  }
  if (!mapped.imageUrls.length) {
    throw new Error('No images found on WeCatalog product')
  }

  return mapped
}
