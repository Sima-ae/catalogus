import type { WooStoreProduct, WooProductListItem } from '@/lib/woocommerce/types'
import { decodeWooHtmlEntities, wooExternalId } from '@/lib/woocommerce/types'

const DEFAULT_PER_PAGE = 100

function normalizeStoreUrl(storeUrl: string): string {
  const trimmed = storeUrl.trim().replace(/\/+$/, '')
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
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

function storeApiBase(storeUrl: string): string {
  return `${normalizeStoreUrl(storeUrl)}/wp-json/wc/store/v1`
}

async function fetchStoreJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ data: T; total: number; totalPages: number }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CatalogusImport/1.0',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

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
