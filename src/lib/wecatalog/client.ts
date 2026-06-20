import type {
  WecatalogApiResponse,
  WecatalogCurrTab,
  WecatalogListContext,
} from '@/lib/wecatalog/types'

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const VALID_TABS = new Set<WecatalogCurrTab>(['all', 'new', 'video', 'photos'])

function parseCurrTab(raw: string | null | undefined): WecatalogCurrTab {
  const tab = String(raw ?? 'all').trim().toLowerCase()
  return VALID_TABS.has(tab as WecatalogCurrTab) ? (tab as WecatalogCurrTab) : 'all'
}

function extractShopIdFromPath(pathname: string): string | null {
  const match = String(pathname ?? '').match(/\/(?:weshop\/)?goods_list\/([^/?#]+)/i)
  return match?.[1]?.trim() || null
}

function parseHashRoute(hash: string): { shopId: string | null; groupId: string | null; currTab: WecatalogCurrTab } {
  const cleaned = String(hash ?? '').replace(/^#/, '')
  const [pathPart, queryPart = ''] = cleaned.split('?')
  const shopId = extractShopIdFromPath(pathPart.startsWith('/') ? pathPart : `/${pathPart}`)
  const params = new URLSearchParams(queryPart)
  return {
    shopId,
    groupId: params.get('groupId')?.trim() || null,
    currTab: parseCurrTab(params.get('tab')),
  }
}

export function normalizeWecatalogListUrl(raw: string): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) throw new Error('WeCatalog catalog list URL is required')
  const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('WeCatalog catalog list URL must use http or https')
  }
  if (!url.hostname.toLowerCase().endsWith('wecatalog.cn')) {
    throw new Error('WeCatalog catalog list URL must be on a wecatalog.cn host')
  }
  return url.toString()
}

export function parseWecatalogListUrl(raw: string): WecatalogListContext {
  const normalized = normalizeWecatalogListUrl(raw)
  const url = new URL(normalized)

  let shopId = extractShopIdFromPath(url.pathname)
  let groupId = url.searchParams.get('groupId')?.trim() || ''
  let currTab = parseCurrTab(url.searchParams.get('tab'))

  if (url.hash) {
    const fromHash = parseHashRoute(url.hash)
    shopId = shopId || fromHash.shopId
    groupId = groupId || fromHash.groupId || ''
    if (!url.searchParams.get('tab')) currTab = fromHash.currTab
  }

  if (!shopId) {
    throw new Error('Could not parse shop id from WeCatalog list URL (expected /weshop/goods_list/{shopId})')
  }
  if (!groupId) {
    throw new Error('WeCatalog list URL must include groupId query parameter')
  }

  const listRefererUrl = `${url.origin}/weshop/goods_list/${shopId}?groupId=${encodeURIComponent(groupId)}`

  return {
    origin: url.origin,
    shopId,
    groupId,
    currTab,
    listRefererUrl,
  }
}

function parseTokenFromSetCookie(setCookie: string | null): string | null {
  if (!setCookie) return null
  const match = setCookie.match(/(?:^|,\s*)token=([^;]+)/i)
  return match?.[1]?.trim() || null
}

function parseTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/i)
  return match?.[1]?.trim() || null
}

export class WecatalogSession {
  private token: string | null = null

  constructor(private readonly context: WecatalogListContext) {}

  getContext(): WecatalogListContext {
    return this.context
  }

  getToken(): string | null {
    return this.token
  }

  async ensureToken(): Promise<string> {
    if (this.token) return this.token

    let res: Response
    try {
      res = await fetch(this.context.listRefererUrl, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': DEFAULT_USER_AGENT,
        },
        redirect: 'follow',
        cache: 'no-store',
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      throw new Error(`Could not reach WeCatalog shop (${detail}): ${this.context.listRefererUrl}`)
    }

    const fromSetCookie = parseTokenFromSetCookie(res.headers.get('set-cookie'))
    if (fromSetCookie) {
      this.token = fromSetCookie
      return this.token
    }

    throw new Error('WeCatalog guest token cookie was not returned — shop may require sign-in')
  }

  clearToken(): void {
    this.token = null
  }

  async fetchJson<T>(
    path: string,
    init: RequestInit & { searchParams?: Record<string, string | number | undefined | null> } = {}
  ): Promise<WecatalogApiResponse<T>> {
    const token = await this.ensureToken()
    const { searchParams, ...rest } = init
    const url = new URL(path.startsWith('http') ? path : `${this.context.origin}${path}`)
    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value === undefined || value === null) continue
        url.searchParams.set(key, String(value))
      }
    }

    const headers = new Headers(rest.headers ?? {})
    headers.set('Accept', 'application/json, text/plain, */*')
    headers.set('User-Agent', DEFAULT_USER_AGENT)
    headers.set('Referer', this.context.listRefererUrl)
    headers.set('Cookie', `token=${token}`)
    if (rest.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    let res: Response
    try {
      res = await fetch(url.toString(), {
        ...rest,
        headers,
        redirect: 'follow',
        cache: 'no-store',
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      throw new Error(`WeCatalog request failed (${detail}): ${url}`)
    }

    const text = await res.text()
    if (!res.ok) {
      throw new Error(`WeCatalog HTTP ${res.status}: ${text.slice(0, 200) || res.statusText}`)
    }
    if (text.includes('群众太热情了')) {
      throw new Error('WeCatalog rate limit — try again later')
    }

    let json: WecatalogApiResponse<T>
    try {
      json = JSON.parse(text) as WecatalogApiResponse<T>
    } catch {
      throw new Error(`WeCatalog returned non-JSON: ${text.slice(0, 200)}`)
    }

    if (json.errcode === 9) {
      this.clearToken()
      const retryToken = await this.ensureToken()
      headers.set('Cookie', `token=${retryToken}`)
      const retryRes = await fetch(url.toString(), {
        ...rest,
        headers,
        redirect: 'follow',
        cache: 'no-store',
      })
      const retryText = await retryRes.text()
      if (!retryRes.ok) {
        throw new Error(`WeCatalog HTTP ${retryRes.status}: ${retryText.slice(0, 200)}`)
      }
      json = JSON.parse(retryText) as WecatalogApiResponse<T>
    }

    return json
  }

  async postAlbumList(params: Record<string, string | number | undefined | null>): Promise<WecatalogApiResponse<unknown>> {
    const { currTab = 'all', ...queryParams } = params
    const tab = String(currTab || 'all')
    return this.fetchJson(`/album/personal/${tab}`, {
      method: 'POST',
      searchParams: queryParams,
      body: JSON.stringify({ tagList: [] }),
    })
  }

  async getCommodityView(shopId: string, goodsId: string): Promise<WecatalogApiResponse<unknown>> {
    return this.fetchJson('/commodity/view', {
      method: 'GET',
      searchParams: {
        targetAlbumId: shopId,
        itemId: goodsId,
        transLang: 'en',
      },
    })
  }
}

export function createWecatalogSession(listUrl: string): WecatalogSession {
  return new WecatalogSession(parseWecatalogListUrl(listUrl))
}

export async function fetchWecatalogRemoteUrl(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      Accept: 'image/*,*/*;q=0.8',
      'User-Agent': DEFAULT_USER_AGENT,
      ...(init?.headers ?? {}),
    },
    redirect: 'follow',
  })
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function tokenFromCookieHeader(cookieHeader: string | null | undefined): string | null {
  return parseTokenFromCookieHeader(String(cookieHeader ?? '').trim() || null)
}
