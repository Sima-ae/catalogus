import { Agent, fetch as undiciFetch } from 'undici'
import type { WooStoreProduct, WooProductListItem } from '@/lib/woocommerce/types'
import {
  decodeWooHtmlEntities,
  parseWooExternalId,
  parseWooSlugExternalId,
  wooExternalId,
  wooSlugExternalId,
} from '@/lib/woocommerce/types'

const DEFAULT_PER_PAGE = 100

/** LiteSpeed/Woo hosts often break HTTP/1.1 (Content-Length + Transfer-Encoding); prefer HTTP/2. */
const wooStoreFetchAgent = new Agent({ allowH2: true })

async function wooStoreFetch(url: string, init?: RequestInit) {
  return undiciFetch(url, {
    ...(init as Parameters<typeof undiciFetch>[1]),
    dispatcher: wooStoreFetchAgent,
  })
}

/** Fetch arbitrary URLs on WooCommerce store hosts (API + wp-content images). Uses HTTP/2. */
export async function fetchWooRemoteUrl(url: string, init?: RequestInit) {
  return wooStoreFetch(url, init)
}

/** Site root only (e.g. https://stuntxl.com) — never a /product/... path. */
export function normalizeWooCommerceStoreUrl(storeUrl: string): string {
  const trimmed = storeUrl.trim()
  if (!trimmed) throw new Error('WooCommerce store URL is required')
  let url: URL
  try {
    url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  } catch {
    throw new Error('Invalid WooCommerce store URL')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('WooCommerce store URL must use http or https')
  }
  return url.origin
}

function normalizeStoreUrl(storeUrl: string): string {
  return normalizeWooCommerceStoreUrl(storeUrl)
}

function storeApiBase(storeUrl: string): string {
  return `${normalizeStoreUrl(storeUrl)}/wp-json/wc/store/v1`
}

async function fetchStoreJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ data: T; total: number; totalPages: number }> {
  let res: Awaited<ReturnType<typeof wooStoreFetch>>
  try {
    res = await wooStoreFetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CatalogusImport/1.0',
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error(
      `Could not reach WooCommerce store (${detail}). Run import:worker on the VPS if the web app cannot access the store.`
    )
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`WooCommerce API ${res.status}: ${body.slice(0, 200) || res.statusText}`)
  }

  const data = (await res.json()) as T
  const total = Number(res.headers.get('X-WP-Total') ?? 0)
  const totalPages = Number(res.headers.get('X-WP-TotalPages') ?? 1)
  return { data, total, totalPages }
}

export async function listWooStoreProducts(
  storeUrl: string,
  options?: { categorySlug?: string | null; perPage?: number }
): Promise<WooStoreProduct[]> {
  const base = storeApiBase(storeUrl)
  const perPage = options?.perPage ?? DEFAULT_PER_PAGE
  const categorySlug = options?.categorySlug?.trim() || null
  const all: WooStoreProduct[] = []
  let page = 1
  let totalPages = 1

  do {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    })
    if (categorySlug) params.set('category', categorySlug)

    const { data, totalPages: pages } = await fetchStoreJson<WooStoreProduct[]>(
      `${base}/products?${params.toString()}`
    )
    all.push(...data)
    totalPages = pages || 1
    page++
  } while (page <= totalPages)

  return all
}

export async function getWooStoreProduct(
  storeUrl: string,
  productId: number
): Promise<WooStoreProduct> {
  const base = storeApiBase(storeUrl)
  const { data } = await fetchStoreJson<WooStoreProduct>(`${base}/products/${productId}`)
  return data
}

/** Variations for a variable product (Store API: type=variation&parent=id). */
export async function listWooStoreVariations(
  storeUrl: string,
  parentProductId: number
): Promise<WooStoreProduct[]> {
  const base = storeApiBase(storeUrl)
  const all: WooStoreProduct[] = []
  let page = 1
  let totalPages = 1

  do {
    const params = new URLSearchParams({
      type: 'variation',
      parent: String(parentProductId),
      page: String(page),
      per_page: String(DEFAULT_PER_PAGE),
    })
    const { data, totalPages: pages } = await fetchStoreJson<WooStoreProduct[]>(
      `${base}/products?${params.toString()}`
    )
    all.push(...data)
    totalPages = pages || 1
    page++
  } while (page <= totalPages)

  return all
}

/** Extract product slug from a WooCommerce product permalink on the same store. */
export function parseWooProductSlugFromUrl(
  productUrl: string,
  storeUrl: string
): string {
  const storeOrigin = normalizeStoreUrl(storeUrl)
  let parsed: URL
  try {
    parsed = new URL(productUrl.trim())
  } catch {
    throw new Error('Invalid product URL')
  }

  const store = new URL(storeOrigin)
  if (parsed.origin !== store.origin) {
    throw new Error('Product URL must be on the same store as the import source')
  }

  const segments = parsed.pathname.split('/').filter(Boolean)
  const productIndex = segments.findIndex((part) => part.toLowerCase() === 'product')
  const slug =
    productIndex >= 0 ? segments[productIndex + 1] : segments[segments.length - 1]

  if (!slug) {
    throw new Error('Could not parse product slug from URL')
  }
  return slug
}

export async function getWooStoreProductBySlug(
  storeUrl: string,
  slug: string
): Promise<WooStoreProduct> {
  const base = storeApiBase(storeUrl)
  const key = slug.trim()
  if (!key) throw new Error('Product slug is required')

  const { data } = await fetchStoreJson<WooStoreProduct[]>(
    `${base}/products?slug=${encodeURIComponent(key)}`
  )
  const product = data[0]
  if (!product) {
    throw new Error(`No WooCommerce product found for slug "${key}"`)
  }
  return product
}

export async function getWooStoreProductByUrl(
  storeUrl: string,
  productUrl: string
): Promise<WooStoreProduct> {
  const slug = parseWooProductSlugFromUrl(productUrl, storeUrl)
  return getWooStoreProductBySlug(storeUrl, slug)
}

/** Resolve a job item to a store product (id, slug, or full product URL). */
export async function fetchWooStoreProductForJobItem(
  storeUrl: string,
  item: { album_id: string; album_url: string }
): Promise<WooStoreProduct> {
  const slugFromId = parseWooSlugExternalId(item.album_id)
  if (slugFromId) {
    return getWooStoreProductBySlug(storeUrl, slugFromId)
  }

  const productId = parseWooExternalId(item.album_id)
  if (productId) {
    return getWooStoreProduct(storeUrl, productId)
  }

  const url = String(item.album_url ?? '').trim()
  if (url) {
    return getWooStoreProductByUrl(storeUrl, url)
  }

  throw new Error(`Cannot resolve WooCommerce product for job item ${item.album_id}`)
}

export function wooProductsToJobItems(products: WooStoreProduct[]): WooProductListItem[] {
  return products.map((product) => ({
    productId: String(product.id),
    externalId: wooExternalId(product.id),
    permalink: product.permalink,
    title: decodeWooHtmlEntities(product.name),
  }))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
